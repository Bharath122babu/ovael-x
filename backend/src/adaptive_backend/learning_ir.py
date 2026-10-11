from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


@dataclass(slots=True)
class CompiledIRObject:
    object_id: str
    object_type: str
    content: str
    source_location: str
    metadata: dict[str, Any]


class LearningIRCompiler:
    """Deterministic first-stage semantic compiler for course material.

    This is deliberately richer than chunking but does not pretend a heuristic is
    a perfect ontology extractor. It creates typed learning objects, explicit
    concept links, and local semantic relations that later model-backed compilers
    can refine without changing provenance or object identity.
    """

    def __init__(self, db: Database):
        self.db = db

    @staticmethod
    def split_units(text: str) -> list[str]:
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        blocks = [x.strip() for x in re.split(r"\n\s*\n", text) if x.strip()]
        units: list[str] = []
        for block in blocks:
            # Keep short numbered/bulleted procedures together; split only long prose.
            if len(block) <= 1800 or re.search(r"(^|\n)\s*(?:\d+[.)]|[-•])\s+", block):
                units.append(block)
                continue
            sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", block)
            buf: list[str] = []
            size = 0
            for sentence in sentences:
                if buf and size + len(sentence) > 1200:
                    units.append(" ".join(buf).strip())
                    buf, size = [], 0
                buf.append(sentence)
                size += len(sentence) + 1
            if buf:
                units.append(" ".join(buf).strip())
        return [u for u in units if len(u) >= 12][:250]

    @staticmethod
    def classify(text: str) -> str:
        lower = text.casefold().strip()
        if re.search(r"\b(counterexample|does not apply|exception to|except when)\b", lower):
            return "counterexample"
        if re.search(r"\b(example|for instance|e\.g\.)\b", lower) or lower.startswith("example"):
            return "example"
        if re.search(r"\b(is defined as|is called|refers to|means|is an?|are an?)\b", lower):
            return "definition"
        if re.search(r"\b(prerequisite|requires understanding|depends on|before learning|prior knowledge)\b", lower):
            return "prerequisite_statement"
        if re.search(r"(^|\n)\s*(?:\d+[.)]|[-•])\s+", text) or sum(token in lower for token in ("first", "then", "next", "finally")) >= 2:
            return "procedure"
        if len(text) <= 900 and (re.search(r"\b[A-Za-z]\s*=", text) or any(symbol in text for symbol in ("→", "⇒", "∑", "Δ", "∫"))):
            return "equation_or_rule"
        if re.search(r"\b(figure|fig\.|diagram|table|image|illustration|shown below|shown in)\b", lower):
            return "visual_reference"
        if "?" in text or re.search(r"\b(question|assessment|rubric|marks?|mcq|choose|explain why|describe)\b", lower):
            return "assessment_item"
        if re.search(r"\b(term|terminology|also known as|abbreviated as|abbreviation)\b", lower):
            return "terminology"
        return "claim"

    def _concept_catalog(self, subject_id: str | None) -> list[tuple[str, str, str]]:
        if not subject_id:
            return []
        rows = self.db.fetchall(
            "SELECT concept_id,name,description FROM concepts WHERE subject_id=? ORDER BY length(name) DESC",
            (subject_id,),
        )
        catalog: list[tuple[str, str, str]] = []
        for row in rows:
            name = str(row["name"] or "")
            n = _norm(name)
            if len(n) >= 3:
                catalog.append((str(row["concept_id"]), name, n))
        return catalog

    @staticmethod
    def _match_concepts(text: str, catalog: list[tuple[str, str, str]]) -> list[str]:
        hay = f" {_norm(text)} "
        matched: list[str] = []
        for concept_id, _name, norm_name in catalog:
            if f" {norm_name} " in hay or (len(norm_name.split()) > 1 and norm_name in hay):
                matched.append(concept_id)
                if len(matched) >= 12:
                    break
        return matched

    def compile_document(
        self,
        *,
        owner_user_id: str,
        document_id: str,
        filename: str,
        course_id: str | None,
        subject_id: str | None,
        source_role: str,
        pages: list[Any],
    ) -> dict[str, Any]:
        self.db.execute(
            "DELETE FROM learning_ir_edges WHERE source_object_id IN (SELECT ir_object_id FROM learning_ir_objects WHERE document_id=? AND owner_user_id=? AND coalesce(course_id,'')=coalesce(?,'')) OR target_object_id IN (SELECT ir_object_id FROM learning_ir_objects WHERE document_id=? AND owner_user_id=? AND coalesce(course_id,'')=coalesce(?,''))",
            (document_id, owner_user_id, course_id, document_id, owner_user_id, course_id),
        )
        self.db.execute(
            "DELETE FROM learning_ir_objects WHERE document_id=? AND owner_user_id=? AND coalesce(course_id,'')=coalesce(?,'')",
            (document_id, owner_user_id, course_id),
        )
        catalog = self._concept_catalog(subject_id)
        now = _now()
        objects: list[CompiledIRObject] = []
        for page in pages:
            text = str(page["extracted_text"] or "")
            if not text.strip():
                continue
            units = self.split_units(text)
            if not units:
                units = [text.strip()[:12000]]
            for index, unit in enumerate(units, start=1):
                object_type = self.classify(unit)
                page_no = int(page["page_no"])
                object_id = f"ir:{course_id or 'personal'}:{document_id}:{page_no}:{index}"
                concept_ids = self._match_concepts(unit, catalog)
                metadata = {
                    "page_no": page_no,
                    "source_role": source_role or "unclassified",
                    "concept_ids": concept_ids,
                    "semantic_version": 2,
                    "provenance": self.db.loads(page["provenance_json"], {}),
                }
                objects.append(
                    CompiledIRObject(
                        object_id=object_id,
                        object_type=object_type,
                        content=unit[:12000],
                        source_location=f"{filename} · page {page_no}",
                        metadata=metadata,
                    )
                )

        self.db.executemany(
            """INSERT INTO learning_ir_objects(
                 ir_object_id,course_id,document_id,owner_user_id,subject_id,object_type,object_key,
                 content,source_location,metadata_json,created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            [
                (
                    obj.object_id,
                    course_id,
                    document_id,
                    owner_user_id,
                    subject_id,
                    obj.object_type,
                    obj.object_id.rsplit(":", 2)[-2] + ":" + obj.object_id.rsplit(":", 1)[-1],
                    obj.content,
                    obj.source_location,
                    self.db.dumps(obj.metadata),
                    now,
                )
                for obj in objects
            ],
        )

        edges: list[tuple[Any, ...]] = []
        for idx, obj in enumerate(objects):
            if idx > 0:
                prev = objects[idx - 1]
                edges.append((f"edge:{prev.object_id}:{obj.object_id}:follows", course_id, prev.object_id, obj.object_id, "follows", 0.55, "{}", now))
                if obj.object_type == "example" and prev.object_type in {"definition", "claim", "equation_or_rule", "procedure"}:
                    edges.append((f"edge:{obj.object_id}:{prev.object_id}:exemplifies", course_id, obj.object_id, prev.object_id, "exemplifies", 0.85, "{}", now))
                if obj.object_type == "visual_reference" and prev.object_type in {"definition", "claim", "procedure"}:
                    edges.append((f"edge:{obj.object_id}:{prev.object_id}:illustrates", course_id, obj.object_id, prev.object_id, "illustrates", 0.75, "{}", now))
                if obj.object_type == "assessment_item":
                    edges.append((f"edge:{obj.object_id}:{prev.object_id}:assesses", course_id, obj.object_id, prev.object_id, "assesses", 0.70, "{}", now))
            obj_concepts = set(obj.metadata.get("concept_ids") or [])
            for prior in objects[max(0, idx - 8):idx]:
                shared = obj_concepts.intersection(prior.metadata.get("concept_ids") or [])
                if shared:
                    meta = self.db.dumps({"concept_ids": sorted(shared)})
                    edges.append((f"edge:{prior.object_id}:{obj.object_id}:same_concept", course_id, prior.object_id, obj.object_id, "same_concept", 0.65, meta, now))
                    break
        self.db.executemany(
            """INSERT OR IGNORE INTO learning_ir_edges(
                 edge_id,course_id,source_object_id,target_object_id,relation,weight,metadata_json,created_at
               ) VALUES(?,?,?,?,?,?,?,?)""",
            edges,
        )
        return {
            "document_id": document_id,
            "course_id": course_id,
            "objects": len(objects),
            "relations": len(edges),
            "semantic_version": 2,
        }

    def summary(self, *, course_id: str) -> dict[str, Any]:
        rows = self.db.fetchall(
            "SELECT object_type,count(*) AS n FROM learning_ir_objects WHERE course_id=? GROUP BY object_type ORDER BY n DESC",
            (course_id,),
        )
        edge_rows = self.db.fetchall(
            "SELECT relation,count(*) AS n FROM learning_ir_edges WHERE course_id=? GROUP BY relation ORDER BY n DESC",
            (course_id,),
        )
        concept_links = 0
        for row in self.db.fetchall("SELECT metadata_json FROM learning_ir_objects WHERE course_id=?", (course_id,)):
            concept_links += len(self.db.loads(row["metadata_json"], {}).get("concept_ids") or [])
        total = sum(int(row["n"]) for row in rows)
        return {
            "course_id": course_id,
            "semantic_version": 2,
            "total_objects": total,
            "by_type": {row["object_type"]: int(row["n"]) for row in rows},
            "total_relations": sum(int(row["n"]) for row in edge_rows),
            "relations": {row["relation"]: int(row["n"]) for row in edge_rows},
            "concept_links": concept_links,
        }
