import { useEffect, useMemo, useState } from "react";
import { useOvael } from "../../context/OvaelContext";
import { topicMermaid } from "../../learningVisuals";
import type { TeacherTab } from "./types";
import { useTeacherData } from "./hooks/useTeacherData";
import { useTeacherActions } from "./hooks/useTeacherActions";
import { TeacherHeader } from "./TeacherHeader";
import { TeacherOnboarding } from "./TeacherOnboarding";
import { OverviewTab } from "./tabs/OverviewTab";
import { RosterTab } from "./tabs/RosterTab";
import { TeacherMaterialsTab } from "./tabs/TeacherMaterialsTab";
import { CurriculumGraphTab } from "./tabs/CurriculumGraphTab";
import { ForensicGapsTab } from "./tabs/ForensicGapsTab";
import { TeacherModals } from "./modals/TeacherModals";

export function TeacherWorkspace() {
  const { courses, documents, refresh, setError } = useOvael();
  const classCourses = useMemo(
    () => courses.filter((course) => course.course_kind === "class"),
    [courses],
  );

  const [tab, setTab] = useState<TeacherTab>("overview");
  const [courseId, setCourseId] = useState(classCourses[0]?.course_id || "");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filter queries
  const [rosterQuery, setRosterQuery] = useState("");
  const [materialsQuery, setMaterialsQuery] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  const effectiveCourseId = courseId || classCourses[0]?.course_id || "";
  const course =
    classCourses.find((item) => item.course_id === effectiveCourseId) ||
    classCourses[0];

  const courseDocuments = useMemo(
    () => documents.filter((document) => document.course_id === course?.course_id),
    [documents, course?.course_id],
  );

  const {
    learners,
    setLearners,
    gaps,
    interventions,
    proposals,
    setProposals,
    activeGraph,
    setActiveGraph,
  } = useTeacherData(course?.course_id || "", setError);

  const actions = useTeacherActions({
    course,
    courseDocuments,
    refresh,
    setError,
    setSuccessMsg,
    setCourseId,
    setLearners,
    setProposals,
    setActiveGraph,
    setTab,
  });

  // Sync edit form with current course
  const { setEditName, setEditDescription } = actions;
  useEffect(() => {
    if (course) {
      setEditName(course.name);
      setEditDescription(course.description || "");
    }
  }, [course, setEditName, setEditDescription]);

  // Dismiss success message after 4.5 seconds
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 4500);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // If no class courses exist, show the clean onboarding view
  if (!course) {
    return (
      <TeacherOnboarding
        courseName={actions.courseName}
        subjectName={actions.subjectName}
        busy={actions.busy}
        onCourseNameChange={actions.setCourseName}
        onSubjectNameChange={actions.setSubjectName}
        onCreateCourse={() => void actions.createCourse()}
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
        busy={actions.busy}
        successMsg={successMsg}
        totalLearners={totalLearners}
        materialsCount={courseDocuments.length}
        proposalsCount={proposals.length}
        isProposalPending={isProposalPending}
        gapCountsCount={Object.keys(gapCounts).length}
        onCourseSelect={setCourseId}
        onTabChange={setTab}
        onEditCourseClick={() => actions.setShowEditModal(true)}
        onCreateCourseClick={() => actions.setShowCreateModal(true)}
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
          learnerName={actions.learnerName}
          busy={actions.busy}
          privacyText={String(gaps.privacy || "")}
          onLearnerNameChange={actions.setLearnerName}
          onEnroll={() => void actions.enroll()}
          onTabChange={setTab}
          onProposeModalOpen={() => actions.setShowProposeModal(true)}
        />
      )}

      {/* TAB 2: ROSTER & ENROLLMENT */}
      {tab === "roster" && (
        <RosterTab
          learnersCount={learners.length}
          filteredLearners={filteredLearners}
          learnerName={actions.learnerName}
          rosterQuery={rosterQuery}
          busy={actions.busy}
          onLearnerNameChange={actions.setLearnerName}
          onRosterQueryChange={setRosterQuery}
          onEnroll={() => void actions.enroll()}
          onUnenrollSelect={actions.setUnenrollTarget}
        />
      )}

      {/* TAB 3: MATERIALS & PIPELINE */}
      {tab === "materials" && (
        <TeacherMaterialsTab
          courseDocumentsCount={courseDocuments.length}
          filteredDocuments={filteredDocuments}
          courseSubjectName={course.subject_name}
          materialsQuery={materialsQuery}
          uploading={actions.uploading}
          busy={actions.busy}
          onMaterialsQueryChange={setMaterialsQuery}
          onFileUpload={(e) => void actions.handleFileUpload(e)}
          onProposeModalOpen={() => actions.setShowProposeModal(true)}
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
          busy={actions.busy}
          onSelectedConceptChange={setSelectedConceptId}
          onApprove={(revId) => void actions.approve(revId)}
          onProposeModalOpen={() => actions.setShowProposeModal(true)}
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

      {/* MODALS */}
      <TeacherModals
        course={course}
        courseDocumentsCount={courseDocuments.length}
        busy={actions.busy}
        showCreateModal={actions.showCreateModal}
        courseName={actions.courseName}
        subjectName={actions.subjectName}
        onCourseNameChange={actions.setCourseName}
        onSubjectNameChange={actions.setSubjectName}
        onCloseCreateModal={() => actions.setShowCreateModal(false)}
        onCreateCourse={() => void actions.createCourse()}
        showEditModal={actions.showEditModal}
        editName={actions.editName}
        editDescription={actions.editDescription}
        onEditNameChange={actions.setEditName}
        onEditDescriptionChange={actions.setEditDescription}
        onCloseEditModal={() => actions.setShowEditModal(false)}
        onUpdateCourseMeta={() => void actions.updateCourseMeta()}
        onDeleteClick={() => {
          actions.setShowEditModal(false);
          actions.setConfirmDelete(true);
        }}
        confirmDelete={actions.confirmDelete}
        onCloseDeleteModal={() => actions.setConfirmDelete(false)}
        onConfirmDelete={() => void actions.deleteCurrentCourse()}
        unenrollTarget={actions.unenrollTarget}
        onCloseUnenrollModal={() => actions.setUnenrollTarget(null)}
        onConfirmUnenroll={() => void actions.handleUnenroll()}
        showProposeModal={actions.showProposeModal}
        proposalObjective={actions.proposalObjective}
        onObjectiveChange={actions.setProposalObjective}
        onCloseProposeModal={() => actions.setShowProposeModal(false)}
        onPropose={() => void actions.propose()}
      />
    </div>
  );
}
