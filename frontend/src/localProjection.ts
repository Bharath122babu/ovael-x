export function latestProjection(
  deltas: Record<string, unknown>[],
  subjectId: string,
) {
  const latest = [...deltas].reverse().find((d) => d.subject_id === subjectId);
  if (!latest) return [];
  const projection: Record<string, unknown> = {
    subject_id: subjectId,
    memory_mode: "local_first",
  };
  for (const field of [
    "concept_states",
    "adaptive_states",
    "proof_states",
    "gap_hypotheses",
  ]) {
    const values = latest[field];
    if (Array.isArray(values)) projection[field] = values.slice(0, 100);
  }
  // Fit inside the backend's 32 KB capsule contract, including UTF-8 labels.
  while (new TextEncoder().encode(JSON.stringify(projection)).length > 28000) {
    const fields = Object.keys(projection).filter(
      (k) =>
        Array.isArray(projection[k]) && (projection[k] as unknown[]).length > 0,
    );
    if (!fields.length) return [];
    const largest = fields.sort(
      (a, b) =>
        JSON.stringify(projection[b]).length -
        JSON.stringify(projection[a]).length,
    )[0];
    projection[largest] = (projection[largest] as unknown[]).slice(
      0,
      Math.floor((projection[largest] as unknown[]).length / 2),
    );
  }
  return [projection];
}
