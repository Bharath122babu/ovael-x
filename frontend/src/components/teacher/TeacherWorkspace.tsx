import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileText,
  GitBranch,
  Layers3,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ovaelApi } from "../../api/client";
import { useOvael } from "../../context/OvaelContext";
import {
  AnimatedProgressBar,
  RadialGauge,
} from "../content/MotionPrimitives";
import { MermaidDiagram } from "../content/MermaidDiagram";
import { topicMermaid } from "../../learningVisuals";

type TeacherTab = "overview" | "roster" | "materials" | "graph" | "gaps";

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
  const [unenrollTarget, setUnenrollTarget] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [proposalObjective, setProposalObjective] = useState("");
  const [showProposeModal, setShowProposeModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div className="page teacher-page">
        <header className="teacher-header-executive">
          <div className="teacher-header-meta">
            <span className="badge-role-tag">
              <ShieldCheck size={14} /> Teacher Workspace
            </span>
            <h1>Educator Course Management</h1>
            <p>
              Create your first class cohort to organize learning materials,
              manage enrolled students, infer concept graphs, and inspect
              privacy-minimized gap forensics.
            </p>
          </div>
        </header>

        <section className="teacher-card-elevated create-course-hero">
          <div className="hero-create-intro">
            <Layers3 size={32} className="hero-icon" />
            <div>
              <h2>Create a New Class Cohort</h2>
              <p>
                A class course provides dedicated syllabus routing, multi-student
                enrollment, human-approved concept dependency graphs, and
                aggregated diagnostic telemetry.
              </p>
            </div>
          </div>

          <form
            className="teacher-form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void createCourse();
            }}
          >
            <div className="form-group">
              <label htmlFor="course-name-input">Course Title</label>
              <input
                id="course-name-input"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="e.g. Data Structures & Algorithms · CS-201"
                required
              />
              <span className="input-hint">The public title shown to enrolled learners.</span>
            </div>

            <div className="form-group">
              <label htmlFor="subject-name-input">Academic Subject</label>
              <input
                id="subject-name-input"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="e.g. Computer Science"
                required
              />
              <span className="input-hint">Used by OVAEL-X to load domain ontological models.</span>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={busy || !courseName.trim() || !subjectName.trim()}
              >
                {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                Create Class Course
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  // Derived metrics
  const gapCounts = (gaps.gap_counts || {}) as Record<string, number>;
  const sharingCount = Number(gaps.learners_sharing || 0);
  const totalLearners = learners.length;
  const sharingRatio = totalLearners > 0 ? Math.round((sharingCount / totalLearners) * 100) : 0;

  const latestProposal = proposals[0];
  const isProposalPending =
    latestProposal && String(latestProposal.status) !== "approved";

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

  const tabs: Array<{
    id: TeacherTab;
    label: string;
    icon: typeof BookOpen;
    count?: number;
    badgeVariant?: "coral" | "amber" | "navy";
  }> = [
    { id: "overview", label: "Executive Overview", icon: Layers3 },
    {
      id: "roster",
      label: "Enrolled Cohort",
      icon: Users,
      count: totalLearners,
      badgeVariant: "navy",
    },
    {
      id: "materials",
      label: "Course Materials",
      icon: BookOpen,
      count: courseDocuments.length,
      badgeVariant: "navy",
    },
    {
      id: "graph",
      label: "Knowledge Graph",
      icon: GitBranch,
      count: proposals.length,
      badgeVariant: isProposalPending ? "amber" : "navy",
    },
    {
      id: "gaps",
      label: "Gap Forensics & Interventions",
      icon: TrendingUp,
      count: Object.keys(gapCounts).length,
      badgeVariant: Object.keys(gapCounts).length > 0 ? "coral" : "navy",
    },
  ];

  return (
    <div className="page teacher-page">
      {/* Toast Notification */}
      {successMsg && (
        <div className="teacher-toast-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setSuccessMsg("")}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Workspace Header */}
      <header className="teacher-header-executive">
        <div className="teacher-header-meta">
          <div className="header-eyebrow-row">
            <span className="badge-role-tag">
              <ShieldCheck size={14} /> Teacher Workspace
            </span>
            <span className="badge-kind-tag">Class Cohort</span>
            <span className="course-code-tag">ID: {course.course_id.slice(0, 10)}</span>
          </div>

          <div className="header-title-row">
            <h1>{course.name}</h1>
            <div className="header-course-selector-wrap">
              <select
                id="teacher-course-select"
                aria-label="Select active course"
                disabled={busy}
                value={course.course_id}
                onChange={(event) => setCourseId(event.target.value)}
                className="teacher-course-select"
              >
                {classCourses.map((item) => (
                  <option key={item.course_id} value={item.course_id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="icon-button-subtle"
                title="Edit course details"
                onClick={() => setShowEditModal(true)}
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                className="icon-button-subtle"
                title="Create another course"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <p className="header-description">
            {course.description || "Class course managed by instructor."} ·{" "}
            <strong>{course.subject_name || course.subject_id}</strong>
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="teacher-nav-tabs" aria-label="Course management sections">
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`teacher-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setTab(item.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={16} className="tab-icon" />
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span className={`tab-counter ${item.badgeVariant || "navy"}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {tab === "overview" && (
        <div className="teacher-tab-content overview-layout">
          {/* Attention Banner if Unapproved Proposal exists */}
          {isProposalPending && (
            <div className="teacher-attention-banner">
              <div className="banner-alert-left">
                <AlertTriangle size={20} className="alert-icon-warning" />
                <div>
                  <strong>Curriculum Knowledge Graph Revision Pending Approval</strong>
                  <p>
                    A new revision (
                    <code>{String(latestProposal.revision_id).slice(0, 8)}</code>
                    ) was inferred from {courseDocuments.length} course sources. Human review
                    is required before it governs student progression.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="primary-button compact"
                onClick={() => setTab("graph")}
              >
                Review Revision <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Metric KPI Cards Grid */}
          <div className="teacher-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Enrolled Cohort</span>
                <Users size={18} className="kpi-icon navy" />
              </div>
              <div className="kpi-value">{totalLearners}</div>
              <div className="kpi-subtext">
                {sharingCount} student{sharingCount === 1 ? "" : "s"} sharing telemetry
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Progress Signal</span>
                <UserCheck size={18} className="kpi-icon coral" />
              </div>
              <div className="kpi-value">{sharingRatio}%</div>
              <div className="kpi-subtext">
                Learner-authorized progress snapshots
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Curriculum Sources</span>
                <BookOpen size={18} className="kpi-icon blue" />
              </div>
              <div className="kpi-value">{courseDocuments.length}</div>
              <div className="kpi-subtext">
                {courseDocuments.filter((d) => d.status === "ready").length} ready for graph inference
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Causal Gap Concepts</span>
                <TrendingUp size={18} className="kpi-icon amber" />
              </div>
              <div className="kpi-value">{Object.keys(gapCounts).length}</div>
              <div className="kpi-subtext">
                Aggregated concept blockers detected
              </div>
            </div>
          </div>

          {/* Progress Sharing Telemetry Section */}
          <section className="teacher-card-elevated telemetry-summary-card">
            <div className="card-heading-split">
              <div>
                <span className="eyebrow-accent">Progress Telemetry Signal</span>
                <h2>Learner-Authorized Diagnostic Coverage</h2>
                <p>
                  Educator insights are generated exclusively from explicit learner
                  consent. Private conversations, conversational turns, and unshared
                  transcripts never leave the student device.
                </p>
              </div>
              <div className="telemetry-gauge-wrap">
                <RadialGauge
                  value={sharingRatio}
                  max={100}
                  size={100}
                  strokeWidth={9}
                  variant="coral"
                  label="Coverage"
                />
              </div>
            </div>

            {totalLearners > 0 && (
              <div className="telemetry-progress-container">
                <AnimatedProgressBar
                  value={sharingCount}
                  max={totalLearners}
                  variant="coral"
                  label="Enrolled learners actively sharing snapshots"
                />
              </div>
            )}
          </section>

          {/* 2-Column Split: Quick Enrollment & Material Readiness */}
          <div className="teacher-overview-split">
            {/* Quick Enrollment Card */}
            <section className="teacher-card-elevated">
              <div className="card-heading-split">
                <div>
                  <span className="eyebrow-accent">Roster Administration</span>
                  <h3>Quick Student Enrollment</h3>
                </div>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setTab("roster")}
                >
                  View All ({totalLearners}) <ChevronRight size={15} />
                </button>
              </div>

              <form
                className="enrollment-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void enroll();
                }}
              >
                <div className="input-with-icon">
                  <Users size={16} className="field-icon" />
                  <input
                    aria-label="Learner username to enroll"
                    value={learnerName}
                    onChange={(event) => setLearnerName(event.target.value)}
                    placeholder="Enter learner username..."
                    disabled={busy}
                  />
                </div>
                <button
                  type="submit"
                  className="primary-button compact"
                  disabled={busy || !learnerName.trim()}
                >
                  {busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
                  Enroll
                </button>
              </form>

              <div className="roster-preview-list">
                {learners.slice(0, 4).map((learner) => (
                  <div key={String(learner.user_id)} className="roster-preview-item">
                    <div className="avatar-chip">
                      {String(learner.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="roster-item-info">
                      <strong>{String(learner.username)}</strong>
                      <span className="roster-status-line">
                        {learner.progress_shared ? (
                          <span className="status-dot-active">
                            <Check size={11} /> Progress Shared
                          </span>
                        ) : (
                          <span className="status-dot-private">
                            <Lock size={11} /> Private (Default)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                {learners.length === 0 && (
                  <p className="empty-subtext">No students enrolled yet. Add your first learner above.</p>
                )}
              </div>
            </section>

            {/* Quick Material Readiness & Proposal */}
            <section className="teacher-card-elevated">
              <div className="card-heading-split">
                <div>
                  <span className="eyebrow-accent">Knowledge Architecture</span>
                  <h3>Curriculum Pipeline</h3>
                </div>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setTab("materials")}
                >
                  Manage Sources ({courseDocuments.length}) <ChevronRight size={15} />
                </button>
              </div>

              <p className="pipeline-desc">
                OVAEL-X digests textbooks, lecture slides, and notes to propose an
                adaptive causal knowledge graph for this cohort.
              </p>

              <div className="pipeline-status-box">
                <div className="pipeline-stat">
                  <strong>{courseDocuments.length}</strong>
                  <span>Syllabus Sources</span>
                </div>
                <div className="pipeline-stat">
                  <strong>{graphNodes.length}</strong>
                  <span>Inferred Concepts</span>
                </div>
                <div className="pipeline-stat">
                  <strong>{proposals.length}</strong>
                  <span>Graph Revisions</span>
                </div>
              </div>

              <div className="pipeline-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={courseDocuments.length === 0 || busy}
                  onClick={() => setShowProposeModal(true)}
                >
                  <GitBranch size={16} /> Propose New Graph
                </button>
                {latestProposal && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setTab("graph")}
                  >
                    Inspect Graph <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* Privacy Minimization Banner */}
          <div className="teacher-privacy-strip">
            <ShieldCheck size={20} className="privacy-icon" />
            <div>
              <strong>Differential Privacy by Backend Contract</strong>
              <p>
                {String(
                  gaps.privacy ||
                    "Aggregated derived progress only; zero raw learner answers, private prompts, or hidden transcripts are accessible.",
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER & ENROLLMENT */}
      {tab === "roster" && (
        <section className="teacher-card-elevated teacher-tab-content">
          <div className="section-toolbar-header">
            <div>
              <span className="eyebrow-accent">Cohort Management</span>
              <h2>Enrolled Students ({learners.length})</h2>
              <p>
                Manage class access, verify student telemetry sharing status,
                and remove learners who have completed or dropped the course.
              </p>
            </div>

            <form
              className="inline-enroll-box"
              onSubmit={(e) => {
                e.preventDefault();
                void enroll();
              }}
            >
              <input
                aria-label="Student username"
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                placeholder="Student username..."
                disabled={busy}
              />
              <button
                type="submit"
                className="primary-button compact"
                disabled={busy || !learnerName.trim()}
              >
                {busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
                Add Student
              </button>
            </form>
          </div>

          {/* Search Bar */}
          <div className="table-search-bar">
            <div className="input-with-icon">
              <Search size={16} className="field-icon" />
              <input
                value={rosterQuery}
                onChange={(e) => setRosterQuery(e.target.value)}
                placeholder="Search enrolled students..."
              />
            </div>
            {rosterQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setRosterQuery("")}
              >
                Clear
              </button>
            )}
          </div>

          {/* Roster Table */}
          <div className="teacher-data-table-wrap">
            <table className="teacher-data-table" aria-label="Enrolled learners table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Enrollment Status</th>
                  <th scope="col">Telemetry Sharing</th>
                  <th scope="col">Enrolled Date</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((learner) => {
                  const uid = String(learner.user_id);
                  const username = String(learner.username);
                  const isShared = Boolean(learner.progress_shared);
                  const enrolledAt = learner.enrolled_at
                    ? new Date(String(learner.enrolled_at)).toLocaleDateString()
                    : "Active";

                  return (
                    <tr key={uid}>
                      <td>
                        <div className="user-cell">
                          <div className="avatar-chip">{username.charAt(0).toUpperCase()}</div>
                          <div>
                            <strong>{username}</strong>
                            <small className="muted-id">ID: {uid.slice(0, 8)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-status-active">
                          <Check size={13} /> {String(learner.status || "enrolled")}
                        </span>
                      </td>
                      <td>
                        {isShared ? (
                          <span className="telemetry-pill shared">
                            <CheckCircle2 size={13} /> Authorized Snapshot
                          </span>
                        ) : (
                          <span className="telemetry-pill private">
                            <Lock size={13} /> Private (Local only)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="date-cell">{enrolledAt}</span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="table-action-danger"
                          title={`Unenroll ${username}`}
                          onClick={() => setUnenrollTarget({ id: uid, username })}
                        >
                          <Trash2 size={15} /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLearners.length === 0 && (
              <div className="table-empty-notice">
                {rosterQuery
                  ? `No students matching "${rosterQuery}".`
                  : "No students currently enrolled in this cohort."}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: MATERIALS & PIPELINE */}
      {tab === "materials" && (
        <section className="teacher-card-elevated teacher-tab-content">
          <div className="section-toolbar-header">
            <div>
              <span className="eyebrow-accent">Curriculum Materials</span>
              <h2>Course Library ({courseDocuments.length})</h2>
              <p>
                Uploaded syllabus materials serve as ground truth for AI learning
                synthesis, concept extraction, and assessment question generation.
              </p>
            </div>

            <div className="toolbar-button-group">
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => void handleFileUpload(e)}
              />
              <button
                type="button"
                className="secondary-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
                Upload Material
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={courseDocuments.length === 0 || busy}
                onClick={() => setShowProposeModal(true)}
              >
                <GitBranch size={16} /> Propose Graph
              </button>
            </div>
          </div>

          {/* Search Materials */}
          <div className="table-search-bar">
            <div className="input-with-icon">
              <Search size={16} className="field-icon" />
              <input
                value={materialsQuery}
                onChange={(e) => setMaterialsQuery(e.target.value)}
                placeholder="Search course materials..."
              />
            </div>
            {materialsQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setMaterialsQuery("")}
              >
                Clear
              </button>
            )}
          </div>

          {/* Materials Table */}
          <div className="teacher-data-table-wrap">
            <table className="teacher-data-table" aria-label="Course documents table">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Status</th>
                  <th scope="col">Size</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col">Focus Subject</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const sizeKb = Math.round(doc.size_bytes / 1024);
                  const isReady = doc.status === "ready";
                  return (
                    <tr key={doc.document_id}>
                      <td>
                        <div className="file-cell">
                          <FileText size={18} className="file-cell-icon" />
                          <div>
                            <strong>{doc.filename}</strong>
                            <small className="muted-id">ID: {doc.document_id.slice(0, 8)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge-status-${isReady ? "active" : "pending"}`}
                        >
                          {doc.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span>{sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`}</span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <span className="subject-tag">
                          {doc.subject_name || course.subject_name || "Course Core"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredDocuments.length === 0 && (
              <div className="table-empty-notice">
                {materialsQuery ? (
                  `No materials matching "${materialsQuery}".`
                ) : (
                  <div>
                    <p>No materials assigned to this course yet.</p>
                    <button
                      type="button"
                      className="primary-button compact"
                      style={{ marginTop: "12px" }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={15} /> Upload First Syllabus Material
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: KNOWLEDGE GRAPH & REVISIONS */}
      {tab === "graph" && (
        <div className="teacher-tab-content graph-layout-view">
          <section className="teacher-card-elevated">
            <div className="section-toolbar-header">
              <div>
                <span className="eyebrow-accent">Ontological Architecture</span>
                <h2>Course Concept Knowledge Graph</h2>
                <p>
                  {graphNodes.length > 0
                    ? `${graphNodes.length} inferred concepts across ${graphEdges.length} dependency edges.`
                    : "No concept graph generated yet."}
                </p>
                {latestProposal && (
                  <div className="revision-metadata-tag">
                    <span>Revision: <code>{String(latestProposal.revision_id).slice(0, 10)}</code></span>
                    <span className={`status-pill ${String(latestProposal.status) === "approved" ? "stable" : "review"}`}>
                      {String(latestProposal.status)}
                    </span>
                  </div>
                )}
              </div>

              <div className="toolbar-button-group">
                {latestProposal && String(latestProposal.status) !== "approved" && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={busy}
                    onClick={() => void approve(String(latestProposal.revision_id))}
                  >
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                    Approve Graph for Cohort
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  disabled={courseDocuments.length === 0 || busy}
                  onClick={() => setShowProposeModal(true)}
                >
                  <GitBranch size={16} /> Propose New Revision
                </button>
              </div>
            </div>

            {/* Visual Mermaid Diagram or Empty Placeholder */}
            {mermaidChartSource ? (
              <div className="teacher-mermaid-canvas">
                <MermaidDiagram
                  source={mermaidChartSource}
                  title={`Concept Graph - ${course.name}`}
                />
              </div>
            ) : (
              <div className="graph-empty-state">
                <GitBranch size={36} className="muted-icon" />
                <h3>No Approved Knowledge Graph</h3>
                <p>
                  Upload course materials and generate a graph proposal to build
                  a visual dependency network for this cohort.
                </p>
                {courseDocuments.length > 0 && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowProposeModal(true)}
                  >
                    <GitBranch size={16} /> Propose Graph from {courseDocuments.length} Sources
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Concept Inspector & Approval Authority Card */}
          <div className="graph-sidebar-grid">
            <section className="teacher-card-elevated">
              <span className="eyebrow-accent">Concept Directory</span>
              <h3>Inferred Concepts ({graphNodes.length})</h3>
              <div className="concept-chips-container">
                {graphNodes.map((node) => {
                  const isSelected = selectedConceptId === node.id;
                  const hasGaps = Boolean(gapCounts[node.id]);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`concept-select-pill ${isSelected ? "selected" : ""} ${hasGaps ? "has-gaps" : ""}`}
                      onClick={() =>
                        setSelectedConceptId(isSelected ? null : node.id)
                      }
                    >
                      <span className="pill-dot" />
                      <strong>{node.label}</strong>
                      {hasGaps && (
                        <span className="pill-gap-counter">
                          {gapCounts[node.id]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="teacher-card-elevated boundary-card">
              <span className="eyebrow-accent">Instructional Safeguards</span>
              <h3>Human-in-the-Loop Governance</h3>
              <p>
                OVAEL-X automates ontology induction from reading materials, but
                never establishes pedagogical authority autonomously.
              </p>
              <ul className="boundary-list">
                <li>
                  <Check size={14} className="check-icon" />
                  <span>Only approved revisions govern learner progress tracking.</span>
                </li>
                <li>
                  <Check size={14} className="check-icon" />
                  <span>Prerequisite edges define causal scaffolding orders.</span>
                </li>
                <li>
                  <Check size={14} className="check-icon" />
                  <span>Educators retain full authority to re-propose or edit.</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* TAB 5: GAP FORENSICS & INTERVENTIONS */}
      {tab === "gaps" && (
        <div className="teacher-tab-content gaps-view-layout">
          {/* Top Aggregated Gaps Table */}
          <section className="teacher-card-elevated">
            <div className="section-toolbar-header">
              <div>
                <span className="eyebrow-accent">Aggregated Telemetry</span>
                <h2>Class-Level Learning Gap Forensics</h2>
                <p>
                  Concepts where enrolled learners have encountered verified
                  blockers or requested scaffolding support.
                </p>
              </div>

              <div className="gap-kpi-badge">
                <Users size={16} />
                <span>{sharingCount} student{sharingCount === 1 ? "" : "s"} sharing data</span>
              </div>
            </div>

            <div className="teacher-data-table-wrap">
              <table className="teacher-data-table" aria-label="Aggregated gaps table">
                <thead>
                  <tr>
                    <th scope="col">Concept</th>
                    <th scope="col">Course Signal</th>
                    <th scope="col">Students Affected</th>
                    <th scope="col">Evidence Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gapCounts).map(([conceptId, count]) => {
                    const ratio = totalLearners > 0 ? (count / totalLearners) * 100 : 0;
                    return (
                      <tr key={conceptId}>
                        <td>
                          <div className="concept-gap-cell">
                            <strong>{conceptId}</strong>
                            <small className="muted-id">Privacy-minimized projection</small>
                          </div>
                        </td>
                        <td>
                          <span className="badge-status-gap">Active Gap Evidence</span>
                        </td>
                        <td>
                          <div className="affected-students-bar">
                            <Users size={14} />
                            <strong>{count}</strong>
                            <div className="bar-track">
                              <div
                                className="bar-fill-coral"
                                style={{ width: `${Math.min(ratio, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="evidence-basis-tag">
                            Learner-authorized progress snapshot
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {Object.keys(gapCounts).length === 0 && (
                <div className="table-empty-notice">
                  {sharingCount === 0
                    ? "No student has shared a course progress snapshot yet. Gap forensics populate as students practice and grant sharing consent."
                    : "Excellent! No active concept blockers detected in current student snapshots."}
                </div>
              )}
            </div>
          </section>

          {/* Cohort Interventions & Decision Support */}
          {cohortActions.length > 0 && (
            <section className="teacher-card-elevated">
              <div className="section-toolbar-header">
                <div>
                  <span className="eyebrow-accent">Pedagogical Decision Support</span>
                  <h2>Recommended Cohort Interventions</h2>
                  <p>
                    Algorithmic group clustering based on shared causal gaps to
                    assist instructor office hours and small-group recitations.
                  </p>
                </div>
              </div>

              <div className="cohort-action-cards-grid">
                {cohortActions.map((action, i) => (
                  <div key={i} className="cohort-action-card">
                    <div className="cohort-card-top">
                      <span className="cohort-intervention-tag">
                        {String(action.intervention).replaceAll("_", " ")}
                      </span>
                      <span className="cohort-count-pill">
                        <Users size={13} /> {Number(action.learner_count)} Students
                      </span>
                    </div>

                    <h4 className="cohort-concept-title">
                      {String(action.concept_id)}
                    </h4>

                    <p className="cohort-recommendation">
                      {String(action.recommendation)}
                    </p>

                    <div className="cohort-student-tags">
                      {Array.isArray(action.learners) &&
                        action.learners.map((uname, j) => (
                          <span key={j} className="student-name-chip">
                            {String(uname)}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Priority Interventions Queue */}
          {topInterventions.length > 0 && (
            <section className="teacher-card-elevated">
              <div className="section-toolbar-header">
                <div>
                  <span className="eyebrow-accent">Actionable Queue</span>
                  <h2>Top Diagnostic Interventions ({topInterventions.length})</h2>
                  <p>
                    Ranked pedagogical recommendations grounded in 4-dimensional
                    mastery proof (independent, transfer, retention, and scaffolding gap).
                  </p>
                </div>
              </div>

              <div className="intervention-queue-list">
                {topInterventions.slice(0, 10).map((item, idx) => {
                  const evidence = (item.evidence || {}) as Record<string, unknown>;
                  return (
                    <div key={idx} className="intervention-queue-card">
                      <div className="queue-priority-badge">
                        <span>Priority</span>
                        <strong>{Number(item.priority || 0)}</strong>
                      </div>

                      <div className="queue-body">
                        <div className="queue-header-row">
                          <span className="queue-intervention-type">
                            {String(item.intervention).replaceAll("_", " ")}
                          </span>
                          <span className="queue-student-tag">
                            Student: <strong>{String(item.learner_username)}</strong>
                          </span>
                          <span className="queue-concept-tag">
                            Concept: <strong>{String(item.concept_id)}</strong>
                          </span>
                        </div>

                        <p className="queue-rationale">{String(item.rationale)}</p>

                        <div className="queue-metrics-strip">
                          <span>Independent: {Math.round(Number(evidence.independent || 0) * 100)}%</span>
                          <span>Transfer: {Math.round(Number(evidence.transfer || 0) * 100)}%</span>
                          <span>Retention: {Math.round(Number(evidence.retention || 0) * 100)}%</span>
                          {evidence.assistance_gap !== undefined && evidence.assistance_gap !== null && (
                            <span>Assistance Gap: {Math.round(Number(evidence.assistance_gap) * 100)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Privacy Disclaimer */}
          <div className="teacher-privacy-strip">
            <ShieldCheck size={20} className="privacy-icon" />
            <div>
              <strong>Decision Support Safeguards</strong>
              <p>
                {String(
                  interventions.authority ||
                    "Decision support only; the teacher remains the instructional authority. Interventions are heuristics over shared progress snapshots and do not disclose raw conversations.",
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CLASS COURSE */}
      {showCreateModal && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
          <div className="teacher-modal">
            <div className="modal-header">
              <h3>Create New Class Course</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void createCourse();
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="create-modal-name">Course Name</label>
                  <input
                    id="create-modal-name"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. Distributed Systems · CS-401"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-modal-subject">Subject Domain</label>
                  <input
                    id="create-modal-subject"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. Computer Science"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy || !courseName.trim() || !subjectName.trim()}
                >
                  {busy && <LoaderCircle className="spin" size={16} />}
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COURSE DETAILS */}
      {showEditModal && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
          <div className="teacher-modal">
            <div className="modal-header">
              <h3>Edit Course Details</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void updateCourseMeta();
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-modal-name">Course Name</label>
                  <input
                    id="edit-modal-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-modal-desc">Description</label>
                  <textarea
                    id="edit-modal-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide overview information for students..."
                  />
                </div>

                <div className="danger-zone-strip">
                  <div>
                    <strong>Danger Zone</strong>
                    <p>Permanently remove this course and its enrolled cohort associations.</p>
                  </div>
                  <button
                    type="button"
                    className="danger-button compact"
                    onClick={() => {
                      setShowEditModal(false);
                      setConfirmDelete(true);
                    }}
                  >
                    Delete Course
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowEditModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy || !editName.trim()}
                >
                  {busy && <LoaderCircle className="spin" size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE COURSE */}
      {confirmDelete && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
          <div className="teacher-modal danger-dialog">
            <div className="modal-header">
              <h3>Delete Course Confirmation</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setConfirmDelete(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{course.name}</strong>?
                This action cannot be undone. All course-specific syllabus links
                and cohort enrollment records will be permanently removed.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void deleteCurrentCourse()}
                disabled={busy}
              >
                {busy && <LoaderCircle className="spin" size={16} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM UNENROLL STUDENT */}
      {unenrollTarget && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
          <div className="teacher-modal danger-dialog">
            <div className="modal-header">
              <h3>Remove Student from Cohort</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUnenrollTarget(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Remove <strong>{unenrollTarget.username}</strong> from{" "}
                <strong>{course.name}</strong>?
              </p>
              <p className="muted-dialog-note">
                The student will no longer see this class course in their course
                list or receive teacher-managed learning updates.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setUnenrollTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleUnenroll()}
                disabled={busy}
              >
                {busy && <LoaderCircle className="spin" size={16} />}
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROPOSE GRAPH */}
      {showProposeModal && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
          <div className="teacher-modal">
            <div className="modal-header">
              <h3>Propose Knowledge Graph</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowProposeModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void propose();
              }}
            >
              <div className="modal-body">
                <p>
                  OVAEL-X will analyze {courseDocuments.length} syllabus sources to
                  infer concept dependencies, learning milestones, and prerequisite
                  scaffolding.
                </p>
                <div className="form-group">
                  <label htmlFor="propose-objective-input">
                    Pedagogical Objective (Optional)
                  </label>
                  <input
                    id="propose-objective-input"
                    value={proposalObjective}
                    onChange={(e) => setProposalObjective(e.target.value)}
                    placeholder={`e.g. Build an introductory concept graph for ${course.name}`}
                  />
                  <span className="input-hint">
                    Guides the concept clustering and prerequisite depth.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowProposeModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <GitBranch size={16} />}
                  Generate Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
