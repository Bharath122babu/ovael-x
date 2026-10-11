# ovael-x Decision + Adaptive Evidence backend v5.0.0

This backend's current full-stack release guide and limitations are at `../README.md` and `../RELEASE_AUDIT.md`. In particular, v5 does NOT grant mastery on ungraded answers and exposes safe abstention for visual/oral/mixed assessment limitations. The historical architecture notes below are retained as context.

# ovael-x Decision + AI Backend 3.0

Backend-only ovael-x release built around a **deterministic Decision Kernel**, a **hard per-turn SemanticBudget**, and **AI only beyond the deterministic boundary**.

## What changed in 3.0

The old `X -> SAM / IRIS / CARL / TRAV` runtime remains removed. The important 3.0 change is that AI is now also removed from `DecisionKernel.plan()` itself.

```text
NormalizedEvent
    -> deterministic learner/adaptive state
    -> deterministic causal-gap projection
    -> deterministic proof/goal/pedagogy policy
    -> deterministic retrieval probe
    -> deterministic reusable-question selection
    -> DecisionFrame
         | T0: execute code only
         | T2: one bounded semantic render when necessary
         | T3: one bounded research-planner call + final render
    -> TeachingPlanIR / output
    -> MemoryCurator commits evidence
```

**Control-plane invariant:** `DecisionKernel.plan()` performs zero model calls. It may request an escalation, but it cannot execute one.

## Hard inference budget

`inference.py` introduces `SemanticBudget`. Every live teaching model request must reserve a slot before provider invocation. Exhausted budgets fail closed to deterministic fallbacks.

Typical live-turn ceilings:

- Verified practice / diagnostic item: **0 model calls**
- MCQ / Boolean / numeric / code grading: **0 model calls**
- Clear rubric / lexical free-text grading: **0 model calls**
- Normal personalized explanation: **<= 1 model call**
- Novel assessment with no reusable verified item: **<= 2 model calls** (generate + validate)
- Deep multi-source teaching turn: **<= 2 model calls** by default (research plan + final teaching render)
- Ambiguous free-text grading: **<= 1 grading call**

The old live deep-research pattern of planner + intermediate synthesis + final explanation has been removed. Retrieval expansion is deterministic after the planner, and the final teaching model performs the synthesis once.

## Code-first upload routing

Material classification now evaluates deterministic catalog/content overlap first. Clear matches never invoke a model. Semantic classification is only an ambiguity fallback.

## Runtime components

- `decision.py` — `DecisionKernel` + one `DecisionFrame` per learner transaction.
- `inference.py` — hard `SemanticBudget` and model-call ledger.
- `semantic.py` — `SemanticCoprocessor`; bounded semantic work only.
- `rlm.py` — deterministic `probe()` separated from semantic `deep_research()`.
- `state_control.py` — `MemoryCurator`; learner-state writer.
- `proof_learning.py` — evidence dimensions and cognitive-sovereignty state.
- `retrieval.py` — deterministic source retrieval.
- `pedagogy.py` — deterministic dynamic teaching policy.
- `teaching.py` — session/execution facade consuming committed decisions.

## Why no agent framework dependency

The backend keeps the useful production patterns—typed state, explicit transitions, call ceilings, observable traces—without introducing LangGraph/PydanticAI/LiteLLM as runtime dependencies. OVAEL's learning transaction graph is sufficiently known in advance that direct code remains smaller, easier to audit, and cheaper.

## Install and run

Python 3.11+:

```bash
python -m pip install -e .
uvicorn adaptive_backend.app:create_app --factory --host 127.0.0.1 --port 8000
```

Tests:

```bash
python -m pip install -e '.[test]'
pytest -q
```

## Introspection

Authenticated runtime topology:

```text
GET /v1/system/decision
```

Teaching moves expose `decision_frame` and `decision_trace`. Semantic turns also expose the per-turn `inference` ledger with allowed/used/remaining calls.

## Validation

- Full backend suite: **123/123 tests passing**
- `python -m compileall`: passed
- Wheel build/import smoke test: included in release validation
- Frontend: **not included**
