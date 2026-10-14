import type { TeachingSession } from "./types";
export function engagement(sessions: TeachingSession[]) {
  const unique = [
    ...new Map(sessions.map((s) => [s.teaching_session_id, s])).values(),
  ];
  const completed = unique.filter(
    (s) =>
      s.status === "completed" &&
      Number.isFinite(s.turn_count) &&
      Number(s.turn_count) > 0,
  );
  const turns = completed.reduce(
    (sum, s) => sum + Math.min(50, Math.max(0, Math.floor(s.turn_count || 0))),
    0,
  );
  const points = completed.length * 10 + turns * 5;
  const days = new Set(
    completed
      .map((s) => new Date(s.ended_at || s.updated_at || ""))
      .filter((d) => Number.isFinite(d.getTime()))
      .map((d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`),
  );
  return {
    points,
    completed: completed.length,
    turns,
    days: days.size,
    badges: [
      { name: "First step", earned: completed.length >= 1 },
      { name: "Building a habit", earned: completed.length >= 3 },
      { name: "Thoughtful practice", earned: turns >= 20 },
    ],
  };
}
