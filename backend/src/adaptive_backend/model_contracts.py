"""Strict contracts for untrusted model judgments."""
from pydantic import BaseModel, ConfigDict, Field


class GradeVerdict(BaseModel):
    model_config = ConfigDict(strict=True, allow_inf_nan=False)
    score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)


class AssessmentVerdict(BaseModel):
    model_config = ConfigDict(strict=True, allow_inf_nan=False)
    accepted: bool
    confidence: float = Field(ge=0, le=1)
    reason: str = ""
