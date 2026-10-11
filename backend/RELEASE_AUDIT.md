# Backend release audit — v5.0.0

See `../RELEASE_AUDIT.md` for the full-stack verification, scope, and remaining blockers.

The backend retains the existing Decision Kernel and learner state owner, adds abstaining multimodal rubric checks, forbids unverified events from changing mastery, introduces shared parent-child inference call budgets for a single learner turn, and returns explicit lesson availability. Adversarial grading and API tests are in `tests/test_v5_safety_contract.py`.

Only model-call ceilings are enforced; no token/cost ceilings or distributed budgets. Diagram topology and oral pronunciation are not independently validated. This is not a high-stakes grading system.
