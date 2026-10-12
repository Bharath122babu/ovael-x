"""Session coordination and durable turn replay helpers."""
from contextlib import contextmanager
from threading import Lock, RLock
from weakref import WeakValueDictionary
import hashlib


class SessionLocks:
    def __init__(self):
        self._guard = Lock()
        self._locks = WeakValueDictionary()

    @contextmanager
    def hold(self, session_id):
        with self._guard:
            lock = self._locks.get(session_id)
            if lock is None:
                lock = RLock()
                self._locks[session_id] = lock
        with lock:
            yield


def request_hash(db, turn, submission):
    payload = turn.model_dump(mode="json")
    # Legacy fields and the equivalent explicit modality submission should
    # produce the same fingerprint. Grading uses this normalized submission.
    payload["submission"] = submission.model_dump(mode="json")
    return hashlib.sha256(db.dumps(payload).encode("utf-8")).hexdigest()


def replay(db, prior, session_row):
    response = db.loads(prior["response_json"], {})
    if response:
        return {**response, "idempotent_replay": True}
    # Compatibility with responses committed before schema version 8.
    evidence = db.loads(prior["evidence_json"], {})
    state = db.loads(session_row["state_json"], {})
    return {
        "teaching_session_id": session_row["teaching_session_id"],
        "turn_id": prior["turn_id"], "idempotent_replay": True,
        "evidence": evidence, "gap_update": evidence.get("gap_update"),
        "move": db.loads(prior["move_json"], {}),
        "state_delta": state.get("state_delta", {}), "decision_summary": None,
    }
