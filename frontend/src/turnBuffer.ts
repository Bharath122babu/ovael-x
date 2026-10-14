export type PendingTurn = { key: string; payload: Record<string, unknown> };
/** Keeps the original response immutable until the server acknowledges it. */
export class TurnBuffer {
  pending: PendingTurn | null = null;
  begin(payload: Record<string, unknown>): PendingTurn {
    if (!this.pending)
      this.pending = {
        key: crypto.randomUUID(),
        payload: structuredClone(payload),
      };
    return this.pending;
  }
  acknowledge(key: string) {
    if (this.pending?.key === key) this.pending = null;
  }
  clear() {
    this.pending = null;
  }
}
