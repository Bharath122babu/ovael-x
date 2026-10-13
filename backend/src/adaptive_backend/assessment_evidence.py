"""Modality-independent grading boundary. Never commits learner state or raw media."""
from __future__ import annotations

import re
import math
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field
from .inference import SemanticBudget

Modality = Literal["text", "image", "handwriting", "diagram", "audio", "code", "numeric", "choice", "mixed"]


class EvidencePart(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    modality: Modality
    text: str = Field(default="", max_length=200_000)
    labels: list[str] = Field(default_factory=list, max_length=200)
    relations: list[tuple[str, str, str]] = Field(default_factory=list, max_length=200)
    numeric_value: float | None = None
    selected_option: int | None = None
    code: str = Field(default="", max_length=200_000)
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)
    media_reference: str | None = None  # Request-scoped, never persisted as evidence.


class AnswerSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")
    parts: list[EvidencePart] = Field(default_factory=list, max_length=16)
    learner_confidence: float | None = Field(default=None, ge=0, le=1)

    @classmethod
    def from_legacy(cls, turn: Any) -> "AnswerSubmission":
        kind = "code" if turn.code else ("choice" if turn.selected_option is not None else ("numeric" if turn.numeric_value is not None else ({"voice":"audio", "image":"image", "handwriting":"handwriting", "diagram":"diagram", "mixed":"mixed"}.get(turn.input_mode, "text"))))
        return cls(parts=[EvidencePart(modality=kind, text=turn.response, code=turn.code or "", numeric_value=turn.numeric_value, selected_option=turn.selected_option)], learner_confidence=turn.confidence)


class EvaluationResult(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    score: float | None = Field(default=None, ge=0, le=1)
    correct: bool | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    status: Literal["graded", "needs_review", "insufficient_input"] = "needs_review"
    feedback: str = ""
    criterion_results: dict[str, float | None] = Field(default_factory=dict)
    modalities: list[str] = Field(default_factory=list)
    needs_review_reason: str | None = None

    def public_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")


class AssessmentEvidenceEngine:
    """One evaluation contract for all modalities; safe abstention for uncertainty."""
    def __init__(self, semantic: Any, code_service: Any = None):
        self.semantic = semantic
        self.code_service = code_service

    @staticmethod
    def _unsafe_literal_claim(text: str) -> bool:
        """Lexical criteria can check vocabulary, not the polarity of a claim.

        Rather than guessing which part a negation modifies, abstain when the
        submission contains an obvious contradiction cue. A semantic evaluator
        may adjudicate the full statement when configured.
        """
        return bool(re.search(
            r"\b(?:no|not|never|without|neither|nor|false|incorrect|wrong|"
            r"lacks?|absent|isn't|aren't|wasn't|doesn't|don't|didn't|"
            r"cannot|can't|consumed|depleted|inhibits?|prevents?|"
            r"instead\s+of)\b",
            text.casefold(),
        ))

    def evaluate(self, item: dict[str, Any], submission: AnswerSubmission,
                 *, budget: SemanticBudget | None = None) -> EvaluationResult:
        parts = submission.parts
        modalities = sorted({part.modality for part in parts})
        def review(reason: str, status: str = "needs_review") -> EvaluationResult:
            return EvaluationResult(status=status, modalities=modalities, needs_review_reason=reason, feedback="Answer received. Evaluation needs verification; mastery was not changed by this answer.")
        if not parts or not any(p.text.strip() or p.code or p.labels or p.relations or p.numeric_value is not None or p.selected_option is not None for p in parts):
            return review("No answer evidence supplied", "insufficient_input")
        kind = str(item.get("answer_type") or "free_text")
        key = item.get("answer_key")
        required = item.get("required_modalities") or (key.get("required_modalities") if isinstance(key, dict) else None)
        if kind == "mixed" and not required:
            return review("Mixed-answer task has no declared mandatory evidence modalities")
        if required:
            if not isinstance(required, list) or not required or not all(isinstance(m, str) and m in Modality.__args__ for m in required):
                return review("Invalid required-modality rubric")
            missing = sorted(set(required) - set(modalities))
            if missing:
                return review("Missing required modalities: " + ", ".join(missing), "insufficient_input")
        if kind in {"diagram", "flowchart", "labelled_image"}:
            # OCR labels are not proof of correct edges, directions or topology.
            return review("Visual topology needs independent, rubric-aware verification")
        if kind in {"oral", "handwritten"} and not (
            isinstance(key, dict) and key.get("grading_scope") == "transcript_content_only"
        ):
            # Speech transcription cannot verify pronunciation/prosody and OCR
            # cannot verify handwriting form, stroke order or diagram geometry.
            return review("This task requires modality-aware verification; transcript content alone is insufficient")
        if kind == "mixed":
            if not isinstance(key, dict) or not isinstance(key.get("modality_criteria"), dict):
                return review("Mixed rubric must define independent modality_criteria")
            criteria = key["modality_criteria"]
            if not all(m in criteria for m in required):
                return review("Mixed rubric missing mandatory modality criteria")
            scores: dict[str, float | None] = {}
            confidences: list[float] = []
            for required_mode in required:
                spec = criteria[required_mode]
                if not isinstance(spec, dict) or "answer_type" not in spec or "answer_key" not in spec:
                    return review("Incomplete rubric for " + required_mode)
                if spec["answer_type"] == "mixed":
                    return review("Nested mixed rubrics are not supported")
                selected = AnswerSubmission(parts=[p for p in parts if p.modality == required_mode])
                result = self.evaluate(spec, selected, budget=budget)
                scores[required_mode] = result.score
                if result.status != "graded" or result.score is None:
                    response = review("Required " + required_mode + " answer cannot be verified: " + (result.needs_review_reason or "needs review"))
                    response.criterion_results = scores
                    return response
                confidences.append(result.confidence)
            # Each mandatory rubric is independently satisfied; partial credit is
            # the simple unweighted mean unless a higher-level scorer is added.
            return EvaluationResult(score=sum(float(s) for s in scores.values()) / len(scores),
                correct=all(float(s) >= float(criteria[m].get("pass_threshold", 0.75)) for m, s in scores.items()),
                confidence=min(confidences), status="graded", criterion_results=scores,
                modalities=modalities, feedback="All required modalities evaluated independently.")
        low_conf = [p for p in parts if p.extraction_confidence is not None and p.extraction_confidence < 0.65]
        if low_conf:
            return review("OCR/transcription/vision extraction confidence below safe grading threshold")
        def graded(score: float, confidence: float = 1., criterion: dict[str,float|None] | None = None) -> EvaluationResult:
            if not math.isfinite(score) or not math.isfinite(confidence) or not 0 <= score <= 1 or not 0 <= confidence <= 1:
                return review("Evaluator returned an invalid score or confidence")
            score = max(0., min(1., score))
            return EvaluationResult(score=score, correct=score >= float(item.get("pass_threshold", .75)), confidence=confidence, status="graded", feedback="Assessment evaluated against the available answer key.", criterion_results=criterion or {}, modalities=modalities)
        if kind == "mcq":
            choice = next((p.selected_option for p in parts if p.selected_option is not None), None)
            if choice is None:
                return review("Option not supplied")
            try:
                return graded(1. if int(choice) == int(key) else 0.)
            except (ValueError, TypeError):
                return review("Invalid MCQ answer key")
        if kind == "boolean":
            answer = " ".join(p.text for p in parts).strip().casefold()
            if answer not in {"true", "false"} or not isinstance(key, bool):
                return review("Boolean response or key is ambiguous")
            return graded(1. if (answer == "true") == key else 0.)
        if kind == "numeric":
            val = next((p.numeric_value for p in parts if p.numeric_value is not None), None)
            if val is None:
                return review("Numeric value not supplied")
            try:
                expected = float(key)
                tolerance = float(item.get("absolute_tolerance", max(1e-6, abs(expected)*1e-4)))
                relative = float(item.get("relative_tolerance", 1e-4))
                if not all(math.isfinite(v) for v in (expected, tolerance, relative)) or tolerance < 0 or relative < 0:
                    return review("Numeric answer key or tolerance is invalid")
                return graded(1. if math.isclose(val, expected, rel_tol=relative, abs_tol=tolerance) else 0.)
            except (ValueError, TypeError):
                return review("Numeric answer key invalid")
        if kind == "code":
            src = next((p.code for p in parts if p.code), "")
            if not src or not isinstance(key, dict) or self.code_service is None:
                return review("Code tests or evaluator unavailable")
            try:
                result = self.code_service.evaluate_dynamic(src, key)
                if result.get("score") is None:
                    return review("Code evaluator could not establish correctness")
                return graded(float(result["score"]), float(result.get("confidence", .5)))
            except (ValueError, TypeError, RuntimeError):
                return review("Code evaluation failed")
        text = " ".join(p.text for p in parts if p.text).strip()
        labels = [label for p in parts for label in p.labels]
        relations = [r for p in parts for r in p.relations]
        norm = lambda value: " ".join(re.findall(r"[\w]+", str(value).casefold()))
        normalized = norm(text)
        if not normalized and not labels and not relations:
            return review("No usable extracted answer text, labels, or relations")
        # Text semantics are NOT safely equivalent to lexical overlap; never award or
        # deny mastery solely from missing keywords in a long paraphrase.
        if isinstance(key, str) and normalized and norm(key) == normalized:
            return graded(1.)
        if isinstance(key, list) and normalized and normalized in {norm(v) for v in key}:
            return graded(1.)
        if isinstance(key, dict):
            accepted = key.get("acceptable_answers") or []
            if normalized and normalized in {norm(v) for v in accepted}:
                return graded(1.)
            # A concept rubric can only grade on exact explicitly declared terms
            # when rubric author explicitly opted in to lexical grading.
            if key.get("grading_method") == "literal_criteria" and not self._unsafe_literal_claim(text):
                required = key.get("required_groups") or []
                if required and all(isinstance(group, list) and group for group in required):
                    match = {f"criterion_{i}": 1. if any(norm(v) in normalized.split(' ') or norm(v) in {norm(l) for l in labels} for v in group) else 0. for i,group in enumerate(required)}
                    if all(len(norm(v).split()) == 1 for group in required for v in group):
                        return graded(sum(match.values())/len(match), .8, match)
            # Structural checks are useful but require all relations to have been
            # independently extracted; otherwise never interpret absence as wrong.
            if key.get("required_relations"):
                return review("Diagram topology needs verified relations and a rubric-aware vision evaluator")
            if key.get("grading_method") == "literal_criteria" and self._unsafe_literal_claim(text):
                return review("Negation or contradiction makes keyword-only grading unsafe")
        if key is None:
            return review("Question lacks a validated answer key")
        if not text:
            return review("Visual evidence requires verified transcription/relations")
        # A caller-owned budget covers both grading and the *next* teaching move.
        # Standalone graders receive a small one-call budget by default.
        scored = self.semantic.grade_ambiguous_free_text(
            answer_key=key, learner_answer=text,
            budget=budget.child(1) if budget is not None else SemanticBudget(1))
        if scored is None:
            return review("Semantic evaluator not configured or unavailable")
        score, confidence = scored
        if confidence < .75:
            return review("Semantic grade below confidence threshold")
        return graded(float(score), float(confidence))
