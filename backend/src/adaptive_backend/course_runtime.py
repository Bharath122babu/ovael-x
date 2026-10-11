from __future__ import annotations

import io
import mimetypes
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from fastapi import UploadFile
from starlette.datastructures import Headers

from .database import Database
from .documents import DocumentService, _ALLOWED_EXTENSIONS
from .learning_ir import LearningIRCompiler


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_SOURCE_CONSTITUTION: dict[str, Any] = {
    "external_sources_allowed": False,
    "teacher_terminology_required": True,
    "citation_required": True,
    "student_personal_sources_allowed": True,
    "conflict_policy": "canonical_wins_for_truth; supplementary_sources_may_explain_but_not_override",
    "roles": {
        "canonical": {"truth_weight": 1.0, "explanation_weight": 0.75},
        "required": {"truth_weight": 0.95, "explanation_weight": 0.70},
        "supplementary": {"truth_weight": 0.55, "explanation_weight": 0.80},
        "preferred_explanation": {"truth_weight": 0.35, "explanation_weight": 1.0},
        "reference": {"truth_weight": 0.45, "explanation_weight": 0.65},
    },
}


class CourseIntelligenceService:
    """Course/source unification layer for OVAEL.

    A course may contain many formats and many owners, but teaching consumes one
    source policy. The service keeps truth authority separate from explanatory
    usefulness and allows enrolled learners to attach private personal sources to
    a teacher-owned course without mutating the teacher corpus.
    """

    MAX_ARCHIVE_ENTRIES = 500
    MAX_ARCHIVE_UNCOMPRESSED = 600 * 1024 * 1024
    MAX_SINGLE_ENTRY = 100 * 1024 * 1024
    MAX_NESTED_ZIP_DEPTH = 0

    def __init__(self, db: Database, documents: DocumentService):
        self.db = db
        self.documents = documents
        self.ir = LearningIRCompiler(db)

    def _course_access(self, user_id: str, course_id: str) -> tuple[dict[str, Any], str]:
        row = self.db.fetchone(
            """SELECT c.*, CASE WHEN c.owner_user_id=? THEN 'owner' ELSE 'learner' END AS access_role
               FROM courses c LEFT JOIN course_enrollments e
                 ON e.course_id=c.course_id AND e.learner_user_id=? AND e.status='active'
               WHERE c.course_id=? AND (c.owner_user_id=? OR e.learner_user_id=?)""",
            (user_id, user_id, course_id, user_id, user_id),
        )
        if not row:
            raise ValueError("Unknown or inaccessible course")
        return dict(row), str(row["access_role"])

    def get_constitution(self, *, user_id: str, course_id: str) -> dict[str, Any]:
        course, role = self._course_access(user_id, course_id)
        row = self.db.fetchone("SELECT policy_json,updated_at FROM source_constitutions WHERE course_id=?", (course_id,))
        policy = self.db.loads(row["policy_json"], {}) if row else {}
        merged = dict(DEFAULT_SOURCE_CONSTITUTION)
        merged.update(policy if isinstance(policy, dict) else {})
        merged["course_id"] = course_id
        merged["viewer_role"] = role
        merged["course_owner_user_id"] = course["owner_user_id"]
        merged["updated_at"] = row["updated_at"] if row else None
        return merged

    def update_constitution(self, *, user_id: str, course_id: str, policy: dict[str, Any]) -> dict[str, Any]:
        course, role = self._course_access(user_id, course_id)
        if role != "owner":
            raise ValueError("Only the course owner may change source authority")
        allowed = {
            "external_sources_allowed",
            "teacher_terminology_required",
            "citation_required",
            "student_personal_sources_allowed",
            "conflict_policy",
        }
        clean: dict[str, Any] = {}
        for key in allowed:
            if key in policy:
                clean[key] = policy[key]
        if "conflict_policy" in clean:
            clean["conflict_policy"] = str(clean["conflict_policy"])[:1000]
        for key in ("external_sources_allowed", "teacher_terminology_required", "citation_required", "student_personal_sources_allowed"):
            if key in clean:
                clean[key] = bool(clean[key])
        now = _now()
        self.db.execute(
            """INSERT INTO source_constitutions(course_id,owner_user_id,policy_json,updated_at)
               VALUES(?,?,?,?) ON CONFLICT(course_id) DO UPDATE SET
               policy_json=excluded.policy_json,updated_at=excluded.updated_at""",
            (course_id, course["owner_user_id"], self.db.dumps(clean), now),
        )
        return self.get_constitution(user_id=user_id, course_id=course_id)

    def list_sources(self, *, user_id: str, course_id: str) -> list[dict[str, Any]]:
        course, _ = self._course_access(user_id, course_id)
        rows = self.db.fetchall(
            """SELECT d.*, r.authority,r.explanation_weight,r.notes,
                      CASE WHEN d.owner_user_id=? THEN 'personal' ELSE 'course' END AS ownership
               FROM documents d
               LEFT JOIN document_source_roles r ON r.course_id=? AND r.document_id=d.document_id
               WHERE d.course_id=?
               UNION ALL
               SELECT d.*, p.usage_role AS authority,1.0 AS explanation_weight,NULL AS notes,'personal' AS ownership
               FROM course_personal_sources p JOIN documents d ON d.document_id=p.document_id
               WHERE p.course_id=? AND p.learner_user_id=? AND p.active=1
               ORDER BY updated_at DESC""",
            (user_id, course_id, course_id, course_id, user_id),
        )
        output: list[dict[str, Any]] = []
        seen: set[str] = set()
        for row in rows:
            if row["document_id"] in seen:
                continue
            seen.add(row["document_id"])
            item = self.documents._row(row)
            item.update({
                "authority": row["authority"] or ("canonical" if row["owner_user_id"] == course["owner_user_id"] else "supplementary"),
                "explanation_weight": float(row["explanation_weight"] if row["explanation_weight"] is not None else 0.75),
                "notes": row["notes"],
                "ownership": row["ownership"],
            })
            output.append(item)
        return output

    def set_document_role(
        self,
        *,
        user_id: str,
        course_id: str,
        document_id: str,
        authority: str,
        explanation_weight: float = 0.75,
        notes: str | None = None,
    ) -> dict[str, Any]:
        course, role = self._course_access(user_id, course_id)
        if role != "owner":
            raise ValueError("Only the course owner may assign course source roles")
        allowed = {"canonical", "required", "supplementary", "reference"}
        if authority not in allowed:
            raise ValueError("Invalid source authority role")
        doc = self.db.fetchone(
            "SELECT 1 FROM documents WHERE document_id=? AND course_id=? AND owner_user_id=?",
            (document_id, course_id, course["owner_user_id"]),
        )
        if not doc:
            raise ValueError("Document is not owned by this course")
        weight = max(0.0, min(1.0, float(explanation_weight)))
        self.db.execute(
            """INSERT INTO document_source_roles(course_id,document_id,owner_user_id,authority,explanation_weight,notes,updated_at)
               VALUES(?,?,?,?,?,?,?) ON CONFLICT(course_id,document_id) DO UPDATE SET
               authority=excluded.authority,explanation_weight=excluded.explanation_weight,
               notes=excluded.notes,updated_at=excluded.updated_at""",
            (course_id, document_id, course["owner_user_id"], authority, weight, (notes or "")[:1000], _now()),
        )
        self.compile_document_ir(user_id=course["owner_user_id"], document_id=document_id)
        return {"course_id": course_id, "document_id": document_id, "authority": authority, "explanation_weight": weight}

    def link_personal_source(
        self, *, user_id: str, course_id: str, document_id: str, usage_role: str = "preferred_explanation"
    ) -> dict[str, Any]:
        _, role = self._course_access(user_id, course_id)
        if role != "learner":
            raise ValueError("Personal course sources are for enrolled learners")
        constitution = self.get_constitution(user_id=user_id, course_id=course_id)
        if not constitution.get("student_personal_sources_allowed", True):
            raise ValueError("This course does not allow personal source linking")
        if usage_role not in {"preferred_explanation", "supplementary", "reference"}:
            raise ValueError("Invalid personal source role")
        doc = self.db.fetchone(
            "SELECT course_id,status FROM documents WHERE document_id=? AND owner_user_id=?",
            (document_id, user_id),
        )
        if not doc:
            raise ValueError("Unknown personal document")
        if doc["course_id"]:
            raise ValueError("Only personal unassigned documents can be linked to a teacher course")
        now = _now()
        self.db.execute(
            """INSERT INTO course_personal_sources(course_id,learner_user_id,document_id,usage_role,active,created_at,updated_at)
               VALUES(?,?,?,?,1,?,?) ON CONFLICT(course_id,learner_user_id,document_id) DO UPDATE SET
               usage_role=excluded.usage_role,active=1,updated_at=excluded.updated_at""",
            (course_id, user_id, document_id, usage_role, now, now),
        )
        self.compile_document_ir(user_id=user_id, document_id=document_id, linked_course_id=course_id)
        self._index_personal_source_for_course(user_id=user_id, course_id=course_id, document_id=document_id)
        return {"course_id": course_id, "document_id": document_id, "usage_role": usage_role, "active": True}

    def unlink_personal_source(self, *, user_id: str, course_id: str, document_id: str) -> None:
        self._course_access(user_id, course_id)
        self.db.execute(
            "DELETE FROM course_personal_sources WHERE course_id=? AND learner_user_id=? AND document_id=?",
            (course_id, user_id, document_id),
        )
        self.db.execute(
            "DELETE FROM knowledge_chunks WHERE owner_user_id=? AND document_id=? AND chunk_id LIKE ?",
            (user_id, document_id, f"personal:{course_id}:{document_id}:%"),
        )
        self.db.execute(
            "DELETE FROM learning_ir_objects WHERE owner_user_id=? AND document_id=? AND course_id=?",
            (user_id, document_id, course_id),
        )

    def _index_personal_source_for_course(self, *, user_id: str, course_id: str, document_id: str) -> int:
        """Index learner-owned pages into the teacher subject without sharing them.

        The chunk course_id intentionally remains NULL. Retrieval admits these
        chunks only through course_personal_sources for the same learner, which
        prevents another enrollee from seeing the private book by course scope.
        """
        course, role = self._course_access(user_id, course_id)
        if role != "learner":
            raise ValueError("Only enrolled learners may attach private sources")
        pages = self.db.fetchall(
            "SELECT page_no,extracted_text,provenance_json FROM document_pages WHERE document_id=? ORDER BY page_no",
            (document_id,),
        )
        self.db.execute(
            "DELETE FROM knowledge_chunks WHERE owner_user_id=? AND document_id=? AND chunk_id LIKE ?",
            (user_id, document_id, f"personal:{course_id}:{document_id}:%"),
        )
        now = _now(); count = 0
        for page in pages:
            text = str(page["extracted_text"] or "").strip()
            if not text:
                continue
            page_no = int(page["page_no"]); count += 1
            self.db.execute(
                """INSERT INTO knowledge_chunks(
                    chunk_id,owner_user_id,course_id,document_id,source_id,subject_id,unit,topic,
                    concept_ids_json,prerequisite_ids_json,difficulty,content_type,content,
                    citation_location,verified,version,created_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    f"personal:{course_id}:{document_id}:p:{page_no}", user_id, None, document_id, document_id,
                    course["subject_id"], "Personal learner source", None, "[]", "[]", 0.5,
                    "personal_uploaded_material", text[:100000], f"personal source · page {page_no}", 0, "1", now,
                ),
            )
        return count

    async def import_package(self, *, user_id: str, course_id: str, upload: UploadFile) -> dict[str, Any]:
        course, role = self._course_access(user_id, course_id)
        if role != "owner":
            raise ValueError("Only the course owner may import a course package")
        filename = Path(upload.filename or "course.zip").name
        if Path(filename).suffix.lower() != ".zip":
            raise ValueError("Course package must be a ZIP archive")
        raw = await upload.read()
        if not raw:
            raise ValueError("Empty course package")
        if len(raw) > self.documents.max_upload_bytes:
            raise ValueError("Course package exceeds upload limit")
        try:
            archive = zipfile.ZipFile(io.BytesIO(raw))
        except zipfile.BadZipFile as exc:
            raise ValueError("Invalid ZIP archive") from exc
        entries = archive.infolist()
        if len(entries) > self.MAX_ARCHIVE_ENTRIES:
            raise ValueError("Course package contains too many files")
        total = 0
        imported: list[dict[str, Any]] = []
        skipped: list[dict[str, str]] = []
        for info in entries:
            if info.is_dir():
                continue
            normalized = info.filename.replace("\\", "/")
            path = PurePosixPath(normalized)
            if normalized.startswith("/") or ".." in path.parts:
                raise ValueError("Course package contains an unsafe path")
            ext = Path(path.name).suffix.lower()
            if ext == ".zip":
                skipped.append({"path": normalized, "reason": "nested archives are disabled"})
                continue
            if ext not in _ALLOWED_EXTENSIONS:
                skipped.append({"path": normalized, "reason": "unsupported learning material"})
                continue
            if info.file_size > self.MAX_SINGLE_ENTRY:
                raise ValueError(f"Archive entry is too large: {normalized}")
            total += info.file_size
            if total > self.MAX_ARCHIVE_UNCOMPRESSED:
                raise ValueError("Course package expands beyond the safety limit")
            data = archive.read(info)
            content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            inner = UploadFile(
                file=io.BytesIO(data),
                filename=path.name,
                headers=Headers({"content-type": content_type}),
            )
            record = await self.documents.upload(
                user_id=user_id,
                upload=inner,
                course_id=course_id,
                auto_route=False,
            )
            role_guess = self._infer_role(normalized)
            self.set_document_role(
                user_id=user_id,
                course_id=course_id,
                document_id=record["document_id"],
                authority=role_guess,
                explanation_weight=0.85 if role_guess in {"supplementary", "reference"} else 0.75,
                notes=f"Imported from {filename}: {normalized}",
            )
            imported.append({**record, "archive_path": normalized, "authority": role_guess})
        return {
            "course_id": course_id,
            "package": filename,
            "imported_count": len(imported),
            "skipped_count": len(skipped),
            "imported": imported,
            "skipped": skipped,
            "learning_ir_objects": self.learning_ir_summary(user_id=user_id, course_id=course_id),
        }

    @staticmethod
    def _infer_role(path: str) -> str:
        lower = path.casefold()
        if any(token in lower for token in ("exam", "question", "rubric", "assessment")):
            return "required"
        if any(token in lower for token in ("syllabus", "official", "textbook", "core")):
            return "canonical"
        if "required" in lower:
            return "required"
        if any(token in lower for token in ("reference", "atlas", "supplement", "extra")):
            return "reference"
        return "supplementary"

    def compile_document_ir(
        self, *, user_id: str, document_id: str, linked_course_id: str | None = None
    ) -> dict[str, Any]:
        doc = self.db.fetchone(
            "SELECT * FROM documents WHERE document_id=? AND owner_user_id=?",
            (document_id, user_id),
        )
        if not doc:
            raise ValueError("Unknown document")
        course_id = linked_course_id or doc["course_id"]
        subject_id = None
        if course_id:
            course = self.db.fetchone("SELECT subject_id FROM courses WHERE course_id=?", (course_id,))
            subject_id = course["subject_id"] if course else None
        role = None
        if course_id:
            role_row = self.db.fetchone(
                "SELECT authority FROM document_source_roles WHERE course_id=? AND document_id=?",
                (course_id, document_id),
            )
            if role_row:
                role = role_row["authority"]
            elif linked_course_id:
                personal = self.db.fetchone(
                    "SELECT usage_role FROM course_personal_sources WHERE course_id=? AND learner_user_id=? AND document_id=? AND active=1",
                    (course_id, user_id, document_id),
                )
                role = personal["usage_role"] if personal else None
        pages = self.db.fetchall(
            "SELECT page_no,extracted_text,provenance_json FROM document_pages WHERE document_id=? ORDER BY page_no",
            (document_id,),
        )
        return self.ir.compile_document(
            owner_user_id=user_id,
            document_id=document_id,
            filename=str(doc["filename"]),
            course_id=course_id,
            subject_id=subject_id,
            source_role=str(role or "unclassified"),
            pages=pages,
        )

    def learning_ir_summary(self, *, user_id: str, course_id: str) -> dict[str, Any]:
        self._course_access(user_id, course_id)
        return self.ir.summary(course_id=course_id)
