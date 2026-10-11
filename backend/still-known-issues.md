# Still-known issues

This file follows up the four bug fixes on the `fix/small-bug-fixes` branch. It lists what those fixes left behind and what was deliberately left for later.

---

## 1. Side effect: older teaching history counts a little less for a while

**What changed.**
The tutor now tells its teaching playbook *why* a learner is struggling, for example "this looks like a misconception". Before the fix the playbook never received this. It fell back to broader labels such as "direct" or "prerequisite".

**Why it matters.**
The playbook remembers which teaching approaches worked before, and in what kind of situation. Part of how it judges "is this situation like that earlier one?" is comparing these labels:
- History saved **after** the fix uses the new, more specific labels.
- History saved **before** the fix uses the old, broader ones.

So for a while, old history looks slightly less similar to new situations than it really is, and the tutor leans on it a little less.

**How bad is it?**
Minor, and temporary:
- Nothing is lost or recorded wrongly. Old history is still used, just with somewhat less weight.
- The effect fades on its own as new lessons build up history with the new labels.
- It doesn't affect marking, progress tracking, or privacy.

**Action needed:** none. If it ever matters, old entries could be relabelled with a one-off migration, but this isn't recommended unless there's a real reason.

---

## 2. Not yet fixed: topic names can be looked up through the AI-app connection in privacy mode

**Where.** `src/adaptive_backend/mcp_server.py`, in the `get_learning_map` tool, in the branch used when the server runs in privacy (`local_first`) mode.

**What happens.**
OVAEL can be connected to outside AI apps such as ChatGPT or Claude, through MCP (a standard way for AI apps to use outside tools). One tool returns the learner's "learning map", the list of topics and how they're going.

In privacy mode, the AI app sends a list of topic IDs and OVAEL replies with each topic's **name**. It doesn't check whether that topic belongs to a course the learner can see. So someone who already knows the ID of a topic in another user's private course could get its name back.

**How bad is it?**
Low:
- The person would need the exact topic ID first. These IDs are long random strings that aren't shown to other users, so guessing one isn't realistic.
- Only the topic's **name** is exposed. No answers, progress, notes, or personal details.
- It needs a valid, user-approved MCP connection token.

The main learning-map leak was fixed on this branch. This is a smaller cousin of it, left out to keep that fix focused.

**Suggested fix.**
Before returning a topic, apply the same "can this user see this subject?" rule that `MemoryService.learning_map` (`src/adaptive_backend/memory.py`) now uses:
- shared built-in subjects are always visible;
- private `USR:` subjects are visible only to the course owner or an actively enrolled learner.

Drop any topic that fails the check. Add a test like `test_learning_map_hides_other_users_private_subjects` in `tests/test_bugfix_regressions.py`, but going through the MCP tool.
