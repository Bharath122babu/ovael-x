import { useEffect, useMemo, useState } from "react";
import { ovaelApi } from "../../api/client";
import { useOvael } from "../../context/OvaelContext";
import { topicMermaid } from "../../learningVisuals";
import type { TeacherTab, UnenrollTarget } from "./types";
import { TeacherHeader } from "./TeacherHeader";
import { TeacherOnboarding } from "./TeacherOnboarding";
import { OverviewTab } from "./tabs/OverviewTab";
import { RosterTab } from "./tabs/RosterTab";
import { TeacherMaterialsTab } from "./tabs/TeacherMaterialsTab";
import { CurriculumGraphTab } from "./tabs/CurriculumGraphTab";
import { ForensicGapsTab } from "./tabs/ForensicGapsTab";
import { CreateCourseModal } from "./modals/CreateCourseModal";
import { EditCourseModal } from "./modals/EditCourseModal";
import { DeleteCourseModal } from "./modals/DeleteCourseModal";
import { UnenrollModal } from "./modals/UnenrollModal";
import { ProposeGraphModal } from "./modals/ProposeGraphModal";

export function TeacherWorkspace() {
  const { courses, documents, refresh, setError } = useOvael();
  const classCourses = useMemo(
    () => courses.filter((course) => course.course_kind === "class"),
    [courses],
  );

  const [tab, setTab] = useState<TeacherTab>("overview");
  const [courseId, setCourseId] = useState(classCourses[0]?.course_id || "");
  const [learners, setLearners] = useState<Array<Record<string, unknown>>>([]);
  const [gaps, setGaps] = useState<Record<string, unknown>>({});
  const [interventions, setInterventions] = useState<Record<string, unknown>>({});
  const [proposals, setProposals] = useState<Array<Record<string, unknown>>>([]);
  const [activeGraph, setActiveGraph] = useState<Record<string, unknown> | null>(null);

  // Form & action states
  const [courseName, setCourseName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [learnerName, setLearnerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filter queries
  const [rosterQuery, setRosterQuery] = useState("");
  const [materialsQuery, setMaterialsQuery] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  // Modals & confirmation dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState<UnenrollTarget | null>(null);
  const [proposalObjective, setProposalObjective] = useState("");
  const [showProposeModal, setShowProposeModal] = useState(false);

  const effectiveCourseId = courseId || classCourses[0]?.course_id || "";
  const course =
    classCourses.find((item) => item.course_id === effectiveCourseId) ||
    classCourses[0];

  const courseDocuments = useMemo(
    () => documents.filter((document) => document.course_id === course?.course_id),
    [documents, course?.course_id],
  );

  // Sync edit form with current course
  useEffect(() => {
    if (course) {
      setEditName(course.name);
      setEditDescription(course.description || "");
    }
  }, [course]);

  // Dismiss success message after 4.5 seconds
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 4500);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // Load course details
  useEffect(() => {
    let cancelled = false;
    setLearners([]);
    setGaps({});
    setInterventions({});
    setProposals([]);
    setActiveGraph(null);

    if (!course?.course_id) return;

    void Promise.allSettled([
      ovaelApi.teacherLearners(course.course_id),
      ovaelApi.teacherGaps(course.course_id),
      ovaelApi.teacherInterventions(course.course_id),
      ovaelApi.graphProposals(course.course_id),
      ovaelApi.activeCourseGraph(course.course_id),
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
  }, [course?.course_id, setError]);

  // Handlers
  const createCourse = async () => {
    if (!courseName.trim() || !subjectName.trim()) return;
    setBusy(true);
    try {
      const created = await ovaelApi.createCourse({
        name: courseName.trim(),
        subject_name: subjectName.trim(),
        description: "Teacher-managed OVAEL-X class cohort",
        course_kind: "class",
      });
      await refresh();
      setCourseId(created.course_id);
      setCourseName("");
      setSubjectName("");
      setShowCreateModal(false);
      setSuccessMsg(`Class course "${created.name}" created successfully.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Course could not be created",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateCourseMeta = async () => {
    if (!course || !editName.trim()) return;
    setBusy(true);
    try {
      await ovaelApi.updateCourse(course.course_id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await refresh();
      setShowEditModal(false);
      setSuccessMsg("Course details updated successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update course details",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteCurrentCourse = async () => {
    if (!course) return;
    setBusy(true);
    try {
      await ovaelApi.deleteCourse(course.course_id);
      await refresh();
      setCourseId("");
      setConfirmDelete(false);
      setSuccessMsg("Course deleted successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete course",
      );
    } finally {
      setBusy(false);
    }
  };

  const enroll = async () => {
    if (!course || !learnerName.trim()) return;
    setBusy(true);
    try {
      await ovaelApi.enrollLearner(course.course_id, learnerName.trim());
      setLearnerName("");
      setLearners(await ovaelApi.teacherLearners(course.course_id));
      setSuccessMsg(`Enrolled "${learnerName.trim()}" in ${course.name}.`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Learner could not be enrolled",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUnenroll = async () => {
    if (!course || !unenrollTarget) return;
    setBusy(true);
    try {
      await ovaelApi.unenrollLearner(course.course_id, unenrollTarget.id);
      setLearners(await ovaelApi.teacherLearners(course.course_id));
      setSuccessMsg(
        `Learner "${unenrollTarget.username}" was removed from the cohort.`,
      );
      setUnenrollTarget(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not unenroll learner",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !course) return;
    setUploading(true);
    try {
      await ovaelApi.uploadDocument(file, course.course_id, false);
      await refresh();
      setSuccessMsg(`Material "${file.name}" uploaded to course library.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to upload document",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const propose = async () => {
    if (!course || !courseDocuments.length) return;
    setBusy(true);
    try {
      const obj =
        proposalObjective.trim() ||
        `Build a structured pedagogical graph for ${course.name}`;
      await ovaelApi.proposeGraph(
        course.course_id,
        courseDocuments.map((document) => document.document_id),
        obj,
      );
      setProposals(await ovaelApi.graphProposals(course.course_id));
      setShowProposeModal(false);
      setProposalObjective("");
      setTab("graph");
      setSuccessMsg("Curriculum knowledge graph proposed. Ready for educator review.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Graph proposal failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const approve = async (revisionId: string) => {
    if (!course) return;
    setBusy(true);
    try {
      await ovaelApi.approveGraph(course.course_id, revisionId);
      setProposals(await ovaelApi.graphProposals(course.course_id));
      setActiveGraph(await ovaelApi.activeCourseGraph(course.course_id));
      setSuccessMsg("Graph revision approved. Now authoritative for cohort learning.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Graph could not be approved",
      );
    } finally {
      setBusy(false);
    }
  };

  // If no class courses exist, show the clean onboarding view
  if (!course) {
    return (
      <TeacherOnboarding
        courseName={courseName}
        subjectName={subjectName}
        busy={busy}
        onCourseNameChange={setCourseName}
        onSubjectNameChange={setSubjectName}
        onCreateCourse={() => void createCourse()}
      />
    );
  }

  // Derived metrics
  const gapCounts = (gaps.gap_counts || {}) as Record<string, number>;
  const sharingCount = Number(gaps.learners_sharing || 0);
  const totalLearners = learners.length;
  const sharingRatio = totalLearners > 0 ? Math.round((sharingCount / totalLearners) * 100) : 0;

  const latestProposal = proposals[0];
  const isProposalPending =
    Boolean(latestProposal && String(latestProposal.status) !== "approved");

  const graphData = (latestProposal?.graph ||
    activeGraph?.graph ||
    activeGraph ||
    {}) as Record<string, unknown>;
  const rawNodes = Array.isArray(graphData.nodes)
    ? (graphData.nodes as Array<Record<string, unknown>>)
    : [];
  const rawEdges = Array.isArray(graphData.edges)
    ? (graphData.edges as Array<Record<string, unknown>>)
    : [];

  const graphNodes = rawNodes.map((node, index) => ({
    id: String(node.id || node.concept_id || `concept_${index}`),
    label: String(
      node.label || node.name || node.id || node.concept_id || `Concept ${index + 1}`,
    ),
  }));

  const graphEdges = rawEdges.map((edge) => ({
    source: String(edge.source || edge.from || ""),
    target: String(edge.target || edge.to || ""),
    relation: String(edge.relation || edge.kind || "prerequisite"),
  }));

  const mermaidChartSource =
    graphNodes.length > 0 ? topicMermaid(graphNodes, graphEdges) : "";

  // Cohort actions from interventions endpoint
  const cohortActions = Array.isArray(interventions.cohort_actions)
    ? (interventions.cohort_actions as Array<Record<string, unknown>>)
    : [];
  const topInterventions = Array.isArray(interventions.top_interventions)
    ? (interventions.top_interventions as Array<Record<string, unknown>>)
    : [];

  // Filtered views
  const filteredLearners = learners.filter((learner) =>
    String(learner.username || "")
      .toLowerCase()
      .includes(rosterQuery.toLowerCase()),
  );

  const filteredDocuments = courseDocuments.filter((doc) =>
    doc.filename.toLowerCase().includes(materialsQuery.toLowerCase()),
  );

  return (
    <div className="page teacher-page">
      {/* Main Workspace Header & Tabs */}
      <TeacherHeader
        course={course}
        classCourses={classCourses}
        tab={tab}
        busy={busy}
        successMsg={successMsg}
        totalLearners={totalLearners}
        materialsCount={courseDocuments.length}
        proposalsCount={proposals.length}
        isProposalPending={isProposalPending}
        gapCountsCount={Object.keys(gapCounts).length}
        onCourseSelect={setCourseId}
        onTabChange={setTab}
        onEditCourseClick={() => setShowEditModal(true)}
        onCreateCourseClick={() => setShowCreateModal(true)}
        onCloseToast={() => setSuccessMsg("")}
      />

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {tab === "overview" && (
        <OverviewTab
          isProposalPending={isProposalPending}
          latestProposal={latestProposal}
          courseDocuments={courseDocuments}
          totalLearners={totalLearners}
          sharingCount={sharingCount}
          sharingRatio={sharingRatio}
          gapCounts={gapCounts}
          learners={learners}
          graphNodes={graphNodes}
          proposals={proposals}
          learnerName={learnerName}
          busy={busy}
          privacyText={String(gaps.privacy || "")}
          onLearnerNameChange={setLearnerName}
          onEnroll={() => void enroll()}
          onTabChange={setTab}
          onProposeModalOpen={() => setShowProposeModal(true)}
        />
      )}

      {/* TAB 2: ROSTER & ENROLLMENT */}
      {tab === "roster" && (
        <RosterTab
          learnersCount={learners.length}
          filteredLearners={filteredLearners}
          learnerName={learnerName}
          rosterQuery={rosterQuery}
          busy={busy}
          onLearnerNameChange={setLearnerName}
          onRosterQueryChange={setRosterQuery}
          onEnroll={() => void enroll()}
          onUnenrollSelect={setUnenrollTarget}
        />
      )}

      {/* TAB 3: MATERIALS & PIPELINE */}
      {tab === "materials" && (
        <TeacherMaterialsTab
          courseDocumentsCount={courseDocuments.length}
          filteredDocuments={filteredDocuments}
          courseSubjectName={course.subject_name}
          materialsQuery={materialsQuery}
          uploading={uploading}
          busy={busy}
          onMaterialsQueryChange={setMaterialsQuery}
          onFileUpload={(e) => void handleFileUpload(e)}
          onProposeModalOpen={() => setShowProposeModal(true)}
        />
      )}

      {/* TAB 4: KNOWLEDGE GRAPH & REVISIONS */}
      {tab === "graph" && (
        <CurriculumGraphTab
          courseName={course.name}
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          latestProposal={latestProposal}
          mermaidChartSource={mermaidChartSource}
          courseDocumentsCount={courseDocuments.length}
          gapCounts={gapCounts}
          selectedConceptId={selectedConceptId}
          busy={busy}
          onSelectedConceptChange={setSelectedConceptId}
          onApprove={(revId) => void approve(revId)}
          onProposeModalOpen={() => setShowProposeModal(true)}
        />
      )}

      {/* TAB 5: GAP FORENSICS & INTERVENTIONS */}
      {tab === "gaps" && (
        <ForensicGapsTab
          sharingCount={sharingCount}
          totalLearners={totalLearners}
          gapCounts={gapCounts}
          cohortActions={cohortActions}
          topInterventions={topInterventions}
          authorityText={String(interventions.authority || "")}
        />
      )}

      {/* MODAL: CREATE CLASS COURSE */}
      <CreateCourseModal
        isOpen={showCreateModal}
        courseName={courseName}
        subjectName={subjectName}
        busy={busy}
        onCourseNameChange={setCourseName}
        onSubjectNameChange={setSubjectName}
        onClose={() => setShowCreateModal(false)}
        onSubmit={() => void createCourse()}
      />

      {/* MODAL: EDIT COURSE DETAILS */}
      <EditCourseModal
        isOpen={showEditModal}
        editName={editName}
        editDescription={editDescription}
        busy={busy}
        onEditNameChange={setEditName}
        onEditDescriptionChange={setEditDescription}
        onClose={() => setShowEditModal(false)}
        onSubmit={() => void updateCourseMeta()}
        onDeleteClick={() => {
          setShowEditModal(false);
          setConfirmDelete(true);
        }}
      />

      {/* MODAL: CONFIRM DELETE COURSE */}
      <DeleteCourseModal
        isOpen={confirmDelete}
        courseName={course.name}
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteCurrentCourse()}
      />

      {/* MODAL: CONFIRM UNENROLL STUDENT */}
      <UnenrollModal
        target={unenrollTarget}
        courseName={course.name}
        busy={busy}
        onClose={() => setUnenrollTarget(null)}
        onConfirm={() => void handleUnenroll()}
      />

      {/* MODAL: PROPOSE GRAPH */}
      <ProposeGraphModal
        isOpen={showProposeModal}
        courseDocumentsCount={courseDocuments.length}
        courseName={course.name}
        proposalObjective={proposalObjective}
        busy={busy}
        onObjectiveChange={setProposalObjective}
        onClose={() => setShowProposeModal(false)}
        onSubmit={() => void propose()}
      />
    </div>
  );
}
