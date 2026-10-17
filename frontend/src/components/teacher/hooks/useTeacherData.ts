import { useEffect, useState } from "react";
import { ovaelApi } from "../../../api/client";

export function useTeacherData(courseId: string, setError: (msg: string) => void) {
  const [learners, setLearners] = useState<Array<Record<string, unknown>>>([]);
  const [gaps, setGaps] = useState<Record<string, unknown>>({});
  const [interventions, setInterventions] = useState<Record<string, unknown>>({});
  const [proposals, setProposals] = useState<Array<Record<string, unknown>>>([]);
  const [activeGraph, setActiveGraph] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLearners([]);
    setGaps({});
    setInterventions({});
    setProposals([]);
    setActiveGraph(null);

    if (!courseId) return;

    void Promise.allSettled([
      ovaelApi.teacherLearners(courseId),
      ovaelApi.teacherGaps(courseId),
      ovaelApi.teacherInterventions(courseId),
      ovaelApi.graphProposals(courseId),
      ovaelApi.activeCourseGraph(courseId),
    ]).then(
      ([
        learnerResult,
        gapResult,
        interventionResult,
        proposalResult,
        graphResult,
      ]) => {
        if (cancelled) return;
        if (
          [
            learnerResult,
            gapResult,
            interventionResult,
            proposalResult,
            graphResult,
          ].some((result) => result.status === "rejected")
        ) {
          setError(
            "Some course details could not load. Refresh the workspace to retry.",
          );
        }
        if (learnerResult.status === "fulfilled") {
          setLearners(learnerResult.value);
        }
        if (gapResult.status === "fulfilled") {
          setGaps(gapResult.value);
        }
        if (interventionResult.status === "fulfilled") {
          setInterventions(interventionResult.value);
        }
        if (proposalResult.status === "fulfilled") {
          setProposals(proposalResult.value);
        }
        if (graphResult.status === "fulfilled") {
          setActiveGraph(graphResult.value);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [courseId, setError]);

  return {
    learners,
    setLearners,
    gaps,
    interventions,
    proposals,
    setProposals,
    activeGraph,
    setActiveGraph,
  };
}
