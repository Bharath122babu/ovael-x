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

## 2. Resolved on 13 October 2026: private topic names through MCP

The local-first `get_learning_map` tool previously resolved names for arbitrary concept IDs without checking course access. It now uses the same visible-subject rule as the server learning map: built-in subjects remain visible, and private subjects require canonical course ownership or active enrollment. A copied private namespace does not grant access.

The regression `test_mcp_map_checks_private_ownership_and_active_enrollment` covers an authenticated MCP connection, denied private lookup, permitted lookup after enrollment, and denial after enrollment is revoked. The backend audit remediation report records the broader ownership and persistence repairs.
