from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


InputModality = Literal[
    "text", "voice", "image", "document", "video", "audio", "archive", "code", "ui"
]
OutputModality = Literal["text", "voice", "visual", "assessment", "interactive"]


class NormalizedEvent(BaseModel):
    """Modality-independent event entering the OVAEL cognitive runtime.

    OCR, STT, file extraction and UI adapters may produce very different raw
    payloads. Cognition never consumes those raw transport objects directly; it
    receives this bounded event contract instead.
    """

    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(default_factory=_now)
    actor: Literal["learner", "teacher", "system"] = "learner"
    event_type: str = Field(min_length=1, max_length=96)
    modality: InputModality
    user_id: str | None = None
    course_id: str | None = None
    subject_id: str | None = None
    concept_id: str | None = None
    source_id: str | None = None
    content: str = Field(default="", max_length=250_000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TeachingOutputIntent(BaseModel):
    """Presentation-independent contract emitted after cognition.

    The web UI, TTS, diagram/visual renderers and assessment widgets can all
    consume the same teaching plan without changing the cognitive decision.
    """

    model_config = ConfigDict(extra="forbid")

    teaching_plan_id: str
    modalities: list[OutputModality] = Field(default_factory=lambda: ["text"])
    primary: OutputModality = "text"
    content: str = ""
    citations: list[str] = Field(default_factory=list)
    assessment: dict[str, Any] | None = None
    render_hints: dict[str, Any] = Field(default_factory=dict)


class ModalityRuntime:
    """Owns normalization/render-intent boundaries, not cognition.

    Existing OCR/STT/TTS implementations remain reusable adapters. This class is
    intentionally light: it prevents those modality services from becoming
    pseudo-components or writing learner state.
    """

    def normalize(
        self,
        *,
        event_type: str,
        modality: InputModality,
        content: str = "",
        actor: Literal["learner", "teacher", "system"] = "learner",
        user_id: str | None = None,
        course_id: str | None = None,
        subject_id: str | None = None,
        concept_id: str | None = None,
        source_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        event_id: str | None = None,
    ) -> NormalizedEvent:
        payload: dict[str, Any] = {
            "event_type": event_type,
            "modality": modality,
            "content": content,
            "actor": actor,
            "user_id": user_id,
            "course_id": course_id,
            "subject_id": subject_id,
            "concept_id": concept_id,
            "source_id": source_id,
            "metadata": metadata or {},
        }
        if event_id:
            payload["event_id"] = event_id
        return NormalizedEvent.model_validate(payload)

    def learning_turn(
        self,
        *,
        user_id: str,
        course_id: str | None,
        subject_id: str,
        concept_id: str,
        input_mode: str,
        response: str,
        selected_option: int | None,
        numeric_value: float | None,
        code: str | None,
        learner_intent: str,
        metadata: dict[str, Any] | None = None,
        event_id: str | None = None,
    ) -> NormalizedEvent:
        modality: InputModality = {"code":"code", "voice":"voice", "image":"image", "handwriting":"image", "diagram":"image", "mixed":"ui"}.get(input_mode, "text")
        content = code if modality == "code" and code is not None else response
        meta = dict(metadata or {})
        meta.update({
            "selected_option": selected_option,
            "numeric_value": numeric_value,
            "learner_intent": learner_intent,
        })
        return self.normalize(
            event_type="learning_turn",
            modality=modality,
            content=content or "",
            user_id=user_id,
            course_id=course_id,
            subject_id=subject_id,
            concept_id=concept_id,
            metadata=meta,
            event_id=event_id,
        )

    @staticmethod
    def output_intent(
        *,
        teaching_plan_id: str,
        content: str,
        citations: list[str],
        assessment: dict[str, Any] | None,
        representation_sequence: list[str] | None = None,
    ) -> TeachingOutputIntent:
        sequence = [str(x) for x in (representation_sequence or [])]
        modalities: list[OutputModality] = ["text"]
        if assessment:
            modalities.append("assessment")
        if any("diagram" in x or "visual" in x or "spatial" in x for x in sequence):
            modalities.append("visual")
        if any("interactive" in x or "reconstruct" in x or "prediction" in x for x in sequence):
            modalities.append("interactive")
        # Voice is an available renderer for every textual teaching plan; clients
        # choose whether to invoke TTS rather than cognition deciding a new lesson.
        modalities.append("voice")
        return TeachingOutputIntent(
            teaching_plan_id=teaching_plan_id,
            modalities=list(dict.fromkeys(modalities)),
            primary="assessment" if assessment else "text",
            content=content,
            citations=citations,
            assessment=assessment,
            render_hints={"representation_sequence": sequence},
        )
