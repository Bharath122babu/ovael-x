import { useEffect, useState, useRef, useMemo } from "react";
import {
  BookOpen,
  Plus,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  Layers,
  FileText,
  X,
  Upload,
  FolderPlus,
  Compass,
  GraduationCap,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { api } from "../../../api";
import { ovaelApi } from "../../../api/client";
import { topicMermaid } from "../../../learningVisuals";
import { AnimatedProgressBar } from "../../content/MotionPrimitives";
import type { LearningLaunch } from "../../../types";

export function CoursesScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { courses, subjects, map, documents, refresh, setError } = useOvael();

  // Create Course Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [goal, setGoal] = useState("");
  const [outline, setOutline] = useState("");
  const [level, setLevel] = useState("beginner");
  const [resources, setResources] = useState<"yes" | "no" | null>(null);
  const [studyPlan, setStudyPlan] = useState("");
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const booksInput = useRef<HTMLInputElement>(null);

  // Selected Course & Topics Management
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [topicInput, setTopicInput] = useState("");
  const [concepts, setConcepts] = useState<{ concept_id: string; name: string }[]>([]);
  const [topicSearch, setTopicSearch] = useState("");

  // Search & Filtering State for Courses List
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<"all" | "personal" | "class">("all");
  const [sortBy, setSortBy] = useState<"name" | "topics" | "materials">("name");

  // File management helpers
  function addFiles(incoming: File[]): boolean {
    if (incoming.some((file) => file.size > 50 * 1024 * 1024)) {
      setError("Each file must be 50 MB or smaller.");
      return false;
    }
    setFiles((current) => [
      ...current.filter(
        (file) => !incoming.some((next) => next.name === file.name && next.size === file.size)
      ),
      ...incoming,
    ]);
    return true;
  }

  async function importOutline(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      if (addFiles([file])) {
        setNotice("Study map added as reference material. You can list its topics below.");
      }
      return;
    }
    try {
      if (file.size > 200000) {
        throw new Error("Choose a smaller study map (up to 200 KB).");
      }
      const data = JSON.parse(await file.text());
      if (
        !Array.isArray(data.nodes) ||
        data.nodes.length > 60 ||
        !data.nodes.every(
          (item: any) =>
            typeof item.id === "string" &&
            typeof item.label === "string" &&
            item.label.length >= 2 &&
            item.label.length <= 200
        )
      ) {
        throw new Error("Choose an exported study map with up to 60 named topics.");
      }
      const edges = Array.isArray(data.edges)
        ? data.edges.filter(
            (edge: any) =>
              typeof edge.source === "string" &&
              typeof edge.target === "string" &&
              typeof edge.relation === "string"
          )
        : [];
      setOutline(data.nodes.map((item: any) => item.label).join("\n"));
      const material = new File(
        [
          `# Imported study outline\n\nThis is a study reference. Previous learning status is not imported.\n\n\`\`\`mermaid\n${topicMermaid(data.nodes, edges)}\n\`\`\`\n`,
        ],
        "imported-study-outline.md",
        { type: "text/markdown" }
      );
      setFiles((current) => [
        ...current.filter((item) => item.name !== material.name),
        material,
      ]);
      setNotice("Topic outline imported. Learning scores and evidence are not copied.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the study map.");
    }
  }

  // Load topics for selected course
  useEffect(() => {
    let cancelled = false;
    setConcepts([]);
    if (!selectedCourseId) {
      return;
    }
    void api(`/v1/courses/${selectedCourseId}/concepts`)
      .then((rows) => {
        if (!cancelled) setConcepts(rows || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, setError]);

  // Create course submission
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!subject && !subjectName.trim()) {
        throw new Error("Name the subject you want to learn.");
      }
      const uploadFiles = resources === "yes" ? files : [];
      if (uploadFiles.some((file) => file.size > 50 * 1024 * 1024)) {
        throw new Error("Each book or material must be 50 MB or smaller.");
      }
      const topics = [
        ...new Set(
          outline
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ];
      if (
        topics.length > 60 ||
        topics.some((item) => item.length < 2 || item.length > 200)
      ) {
        throw new Error("Add up to 60 topics, each between 2 and 200 characters.");
      }

      const c = await api("/v1/courses", "POST", {
        name: name.trim(),
        ...(subject
          ? { subject_id: subject }
          : { subject_name: subjectName.trim() }),
        description: [
          `Learning goal: ${goal.trim() || name.trim()}`,
          `Starting level: ${level}`,
          ...(resources === "no" && studyPlan.trim()
            ? [`Study plan preferences: ${studyPlan.trim()}`]
            : []),
          ...(resources === "no" && reference.trim()
            ? [`Optional book or online reference: ${reference.trim()}`]
            : []),
        ].join("\n"),
        course_kind: "personal",
      });

      await refresh();
      setSelectedCourseId(c.course_id);
      setNotice("Course created. Adding your topics and materials…");

      if (!subject) {
        for (const title of topics.length ? topics : ["Getting started"]) {
          await api(`/v1/courses/${c.course_id}/concepts`, "POST", {
            name: title,
          });
        }
      }

      let failed = 0;
      for (const file of uploadFiles) {
        try {
          const document = await ovaelApi.uploadDocument(
            file,
            c.course_id,
            false
          );
          if (!["ready", "ready_partial"].includes(document.status)) failed++;
        } catch {
          failed++;
        }
      }

      setNotice(
        failed
          ? `Course created. ${failed} material(s) could not be processed. Check Materials and add any missing files.`
          : uploadFiles.length
            ? "Course ready. Your uploaded files are also available in Materials."
            : "Course ready. You can start now and add materials later."
      );

      // Reset form
      setName("");
      setSubjectName("");
      setGoal("");
      setOutline("");
      setFiles([]);
      setResources(null);
      setStudyPlan("");
      setReference("");
      if (booksInput.current) booksInput.current.value = "";
      setShowCreateForm(false);
      await refresh();
      setConcepts(await api(`/v1/courses/${c.course_id}/concepts`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Course creation failed.");
    } finally {
      setBusy(false);
    }
  }

  // Add individual topic to selected course
  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !topicInput.trim() || !selectedCourseId) return;
    setBusy(true);
    try {
      await api(`/v1/courses/${selectedCourseId}/concepts`, "POST", {
        name: topicInput.trim(),
      });
      setConcepts(await api(`/v1/courses/${selectedCourseId}/concepts`));
      setTopicInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Topic creation failed.");
    } finally {
      setBusy(false);
    }
  }

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (filterKind !== "all" && c.course_kind !== filterKind) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const subName = subjects.find((s) => s.subject_id === c.subject_id)?.name || "";
        return (
          c.name.toLowerCase().includes(q) ||
          subName.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "topics") {
          const aCount = map.nodes.filter((n) => n.subject_id === a.subject_id).length;
          const bCount = map.nodes.filter((n) => n.subject_id === b.subject_id).length;
          return bCount - aCount;
        }
        if (sortBy === "materials") {
          const aDocs = documents.filter((d) => d.course_id === a.course_id).length;
          const bDocs = documents.filter((d) => d.course_id === b.course_id).length;
          return bDocs - aDocs;
        }
        return 0;
      });
  }, [courses, filterKind, searchQuery, sortBy, subjects, map.nodes, documents]);

  const activeCourse = courses.find((c) => c.course_id === selectedCourseId);
  const totalTopics = map.nodes.length;
  const totalMaterials = documents.length;

  return (
    <div className="page courses-page">
      {/* Page Header */}
      <header className="page-heading courses-header">
        <div className="courses-header-info">
          <p className="eyebrow blue">Curriculum & Learning Paths</p>
          <h1>Courses</h1>
          <p className="page-lead">
            Build personal courses, organize learning topics, and connect textbooks and notes for adaptive tutoring.
          </p>
        </div>

        <div className="courses-header-actions">
          <div className="courses-stats-pills" aria-label="Course summary metrics">
            <span className="stat-pill" title={`${courses.length} active courses`}>
              <BookOpen size={14} />
              <strong>{courses.length}</strong> courses
            </span>
            <span className="stat-pill" title={`${totalTopics} total topics across subjects`}>
              <Layers size={14} />
              <strong>{totalTopics}</strong> topics
            </span>
            <span className="stat-pill" title={`${totalMaterials} attached study materials`}>
              <FileText size={14} />
              <strong>{totalMaterials}</strong> materials
            </span>
          </div>

          <button
            type="button"
            className="primary-button create-course-trigger"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setNotice("");
            }}
            aria-expanded={showCreateForm}
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? "Close Studio" : "Create Course"}
          </button>
        </div>
      </header>

      {/* Global Status/Notice Banner */}
      {notice && (
        <aside className="chat-notice-card" role="status">
          <Sparkles size={18} className="notice-icon" />
          <p>{notice}</p>
          <button
            type="button"
            className="icon-button close-notice-btn"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Course Creation Studio (Collapsible Card) */}
      {showCreateForm && (
        <section className="course-studio-panel" aria-label="Create course studio">
          <div className="studio-header">
            <div>
              <span className="studio-tag">Course Studio</span>
              <h2>Design a Personal Course</h2>
              <p>Configure learning goals, syllabus topics, and reference materials.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close studio"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreate} className="studio-form">
            {/* Step 1: Course Identity */}
            <fieldset className="studio-fieldset">
              <legend>
                <span className="step-num">1</span> Course Identity & Subject
              </legend>

              <div className="studio-field-grid">
                <label className="studio-label">
                  Course Title <span className="required-star">*</span>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Distributed Systems & Consensus"
                    disabled={busy}
                    className="studio-input"
                  />
                  <small className="field-hint">Give your course a memorable, descriptive name.</small>
                </label>

                <label className="studio-label">
                  Subject Domain <span className="required-star">*</span>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (e.target.value) setSubjectName("");
                    }}
                    disabled={busy}
                    className="studio-select"
                  >
                    <option value="">+ Create new subject domain</option>
                    {subjects.map((s) => (
                      <option value={s.subject_id} key={s.subject_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <small className="field-hint">Group with existing catalog or establish a custom domain.</small>
                </label>
              </div>

              {!subject && (
                <div className="studio-field-row">
                  <label className="studio-label">
                    New Subject Name <span className="required-star">*</span>
                    <input
                      required
                      value={subjectName}
                      maxLength={200}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. Distributed Computing, Discrete Mathematics, Biochemistry"
                      disabled={busy}
                      className="studio-input"
                    />
                    <small className="field-hint">Unique subject label under which topics will be indexed.</small>
                  </label>
                </div>
              )}
            </fieldset>

            {/* Step 2: Learning Objectives & Starting Level */}
            <fieldset className="studio-fieldset">
              <legend>
                <span className="step-num">2</span> Learning Objectives & Baseline
              </legend>

              <div className="studio-field-grid">
                <label className="studio-label">
                  What do you want to accomplish?
                  <textarea
                    value={goal}
                    maxLength={1500}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Describe your target outcomes, exams, projects, or mastery criteria."
                    disabled={busy}
                    className="studio-textarea"
                    rows={3}
                  />
                  <small className="field-hint">Guides the AI tutor's assessment difficulty and explanations.</small>
                </label>

                <label className="studio-label">
                  Starting Proficiency Level
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    disabled={busy}
                    className="studio-select"
                  >
                    <option value="beginner">Fresh Start (No prior background)</option>
                    <option value="some_experience">Intermediate (Some foundational knowledge)</option>
                    <option value="review">Advanced / Review (Strengthening edge cases)</option>
                  </select>
                  <small className="field-hint">Initial diagnostic baseline for question difficulty.</small>
                </label>
              </div>
            </fieldset>

            {/* Step 3: Syllabus Topics */}
            {!subject && (
              <fieldset className="studio-fieldset">
                <legend>
                  <span className="step-num">3</span> Topics & Syllabus Outline
                </legend>

                <label className="studio-label">
                  Topics to Cover (optional)
                  <textarea
                    value={outline}
                    onChange={(e) => setOutline(e.target.value)}
                    placeholder="Vector Clocks&#10;Raft Consensus Algorithm&#10;Paxos Protocol&#10;Two-Phase Commit"
                    disabled={busy}
                    className="studio-textarea topic-outline-textarea"
                    rows={4}
                  />
                  <small className="field-hint">
                    Add up to 60 topics, separated by commas or newlines (2–200 characters each).
                  </small>
                </label>
              </fieldset>
            )}

            {/* Step 4: Study Materials & References */}
            <fieldset className="studio-fieldset">
              <legend>
                <span className="step-num">{!subject ? "4" : "3"}</span> Study Materials & Reference
              </legend>

              <div className="resource-choice-grid">
                <label className={`resource-card-option ${resources === "yes" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="course-resources"
                    checked={resources === "yes"}
                    onChange={() => setResources("yes")}
                    disabled={busy}
                  />
                  <div className="option-content">
                    <FolderPlus size={18} />
                    <strong>Attach study files now</strong>
                    <small>Upload PDFs, slides, notes, or an exported JSON study map.</small>
                  </div>
                </label>

                <label className={`resource-card-option ${resources === "no" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="course-resources"
                    checked={resources === "no"}
                    onChange={() => setResources("no")}
                    disabled={busy}
                  />
                  <div className="option-content">
                    <Compass size={18} />
                    <strong>Start without uploading</strong>
                    <small>Specify study plan preferences or add materials later.</small>
                  </div>
                </label>
              </div>

              {resources === "no" && (
                <div className="studio-field-grid optional-plan-fields">
                  <label className="studio-label">
                    Study Schedule & Pace Preferences
                    <textarea
                      value={studyPlan}
                      disabled={busy}
                      maxLength={1500}
                      onChange={(e) => setStudyPlan(e.target.value)}
                      placeholder="e.g. 30 minutes daily practice, emphasis on worked examples and conceptual proofs."
                      className="studio-textarea"
                      rows={2}
                    />
                  </label>

                  <label className="studio-label">
                    Online Resource / Recommended Book
                    <textarea
                      value={reference}
                      disabled={busy}
                      maxLength={500}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. 'Designing Data-Intensive Applications' by Martin Kleppmann"
                      className="studio-textarea"
                      rows={2}
                    />
                  </label>
                </div>
              )}

              {resources === "yes" && (
                <div className="upload-studio-section">
                  <div className="upload-row">
                    <label className="studio-file-picker">
                      <div className="file-picker-content">
                        <Upload size={20} />
                        <div>
                          <strong>Import Study Map or Syllabus</strong>
                          <small>JSON topic map (up to 200 KB) or syllabus document (up to 50 MB)</small>
                        </div>
                      </div>
                      <input
                        type="file"
                        className="sr-only"
                        disabled={busy}
                        accept=".json,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => void importOutline(e.target.files?.[0])}
                      />
                    </label>

                    <label className="studio-file-picker">
                      <div className="file-picker-content">
                        <BookOpen size={20} />
                        <div>
                          <strong>Upload Textbooks & Notes</strong>
                          <small>PDF, EPUB, DOCX, PPTX, TXT, MD, images, or audio (up to 50 MB each)</small>
                        </div>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        disabled={busy}
                        ref={booksInput}
                        accept=".pdf,.epub,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
                        onChange={(e) => {
                          addFiles(Array.from(e.target.files || []));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="attached-files-container">
                      <h4 className="attached-heading">Attached Files ({files.length})</h4>
                      <ul className="attached-files-list" aria-label="Selected course files">
                        {files.map((file, index) => (
                          <li key={`${file.name}-${index}`} className="attached-file-item">
                            <FileText size={16} className="file-item-icon" />
                            <div className="file-item-meta">
                              <span className="file-name">{file.name}</span>
                              <span className="file-size">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                            <button
                              type="button"
                              className="icon-button remove-file-btn"
                              disabled={busy}
                              onClick={() =>
                                setFiles((current) =>
                                  current.filter((_, itemIndex) => itemIndex !== index)
                                )
                              }
                              aria-label={`Remove ${file.name}`}
                            >
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </fieldset>

            {/* Submit Action Bar */}
            <div className="studio-action-bar">
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button create-submit-btn"
                disabled={busy || !name.trim()}
              >
                {busy ? (
                  <>
                    <RefreshCw size={16} className="spin-icon" />
                    <span>Configuring Course…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create Course</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Courses Search, Filter & View Controls */}
      <section className="courses-filter-bar" aria-label="Course filters">
        <div className="filter-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            aria-label="Search your courses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course title, subject domain, or objectives…"
            className="filter-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="icon-button clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-actions-group">
          {/* Filter Kind Pills */}
          <div className="filter-pill-group" role="radiogroup" aria-label="Course type filter">
            <button
              type="button"
              className={`filter-pill-btn ${filterKind === "all" ? "active" : ""}`}
              onClick={() => setFilterKind("all")}
            >
              All Courses ({courses.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterKind === "personal" ? "active" : ""}`}
              onClick={() => setFilterKind("personal")}
            >
              Personal ({courses.filter((c) => c.course_kind === "personal").length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterKind === "class" ? "active" : ""}`}
              onClick={() => setFilterKind("class")}
            >
              Class ({courses.filter((c) => c.course_kind === "class").length})
            </button>
          </div>

          {/* Sort By Dropdown */}
          <label className="sort-select-wrap">
            <span className="sort-label">Sort:</span>
            <select
              aria-label="Sort courses by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-dropdown"
            >
              <option value="name">Alphabetical (A–Z)</option>
              <option value="topics">Topic Count</option>
              <option value="materials">Materials Attached</option>
            </select>
          </label>
        </div>
      </section>

      {/* Main Course Cards Grid */}
      <div className="courses-grid-layout">
        {filteredCourses.map((c) => {
          const subjectObj = subjects.find((s) => s.subject_id === c.subject_id);
          const courseTopics = map.nodes.filter((n) => n.subject_id === c.subject_id);
          const courseDocs = documents.filter((d) => d.course_id === c.course_id);
          const isSelected = selectedCourseId === c.course_id;

          return (
            <article
              key={c.course_id}
              className={`course-card-tile ${isSelected ? "is-selected-course" : ""}`}
            >
              <div className="course-tile-top">
                <div className="course-badges-row">
                  <span
                    className={`course-kind-badge ${c.course_kind === "class" ? "is-class" : "is-personal"}`}
                  >
                    {c.course_kind === "class" ? (
                      <>
                        <GraduationCap size={12} /> Class
                      </>
                    ) : (
                      <>
                        <Compass size={12} /> Personal
                      </>
                    )}
                  </span>

                  <span className="course-subject-badge" title={subjectObj?.name || c.subject_id}>
                    {subjectObj?.name || "Subject"}
                  </span>

                  {c.membership && (
                    <span className="membership-tag">
                      {c.membership === "owner" ? "Owner" : "Enrolled"}
                    </span>
                  )}
                </div>

                <h3 className="course-card-title">{c.name}</h3>

                <p className="course-card-desc">
                  {c.description
                    ? c.description.split("\n")[0]
                    : "Interactive workspace for adaptive learning, practice problems, and concept proofs."}
                </p>
              </div>

              <div className="course-tile-stats">
                <div className="tile-stat-item" title={`${courseTopics.length} total concepts mapped`}>
                  <Layers size={15} />
                  <span>
                    <strong>{courseTopics.length}</strong> topics
                  </span>
                </div>

                <div className="tile-stat-item" title={`${courseDocs.length} textbooks & resources`}>
                  <FileText size={15} />
                  <span>
                    <strong>{courseDocs.length}</strong> materials
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="course-tile-progress">
                <div className="progress-label-row">
                  <small>Topic Coverage</small>
                  <small>
                    {courseTopics.length > 0 ? `${courseTopics.length} mapped` : "Initial"}
                  </small>
                </div>
                <AnimatedProgressBar
                  value={courseTopics.length}
                  max={Math.max(10, courseTopics.length)}
                  variant="coral"
                />
              </div>

              {/* Action Buttons */}
              <div className="course-tile-actions">
                <button
                  type="button"
                  className="primary-button continue-learning-btn"
                  onClick={() =>
                    onLearn({
                      courseId: c.course_id,
                      subjectId: c.subject_id,
                    })
                  }
                  title="Launch active tutoring session"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  className={`quiet-button view-topics-btn ${isSelected ? "active" : ""}`}
                  disabled={busy}
                  onClick={() =>
                    setSelectedCourseId((prev) => (prev === c.course_id ? "" : c.course_id))
                  }
                  aria-expanded={isSelected}
                  title="Inspect topics and syllabus"
                >
                  <span>{isSelected ? "Hide Topics" : "Syllabus"}</span>
                  <ChevronRight
                    size={14}
                    style={{
                      transform: isSelected ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Empty States */}
      {courses.length === 0 && (
        <section className="courses-empty-state" aria-label="No courses available">
          <div className="empty-icon-circle">
            <BookOpen size={36} />
          </div>
          <h2>Begin Your Learning Journey</h2>
          <p>
            Create your first personal course, specify learning goals, and attach textbooks or notes.
            OVAEL-X will adaptively structure concepts into interactive practice sessions.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={16} />
            Create Your First Course
          </button>
        </section>
      )}

      {courses.length > 0 && filteredCourses.length === 0 && (
        <section className="courses-empty-state" aria-label="No matching courses">
          <div className="empty-icon-circle">
            <Filter size={32} />
          </div>
          <h2>No matching courses found</h2>
          <p>
            We couldn't find any courses matching "<strong>{searchQuery}</strong>". Try searching with
            different keywords or reset the filter.
          </p>
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              setSearchQuery("");
              setFilterKind("all");
            }}
          >
            Reset Filters
          </button>
        </section>
      )}

      {/* Selected Course Topics Studio & Inspector */}
      {selectedCourseId && activeCourse && (
        <section className="topics-inspector-panel" aria-label="Course topics syllabus">
          <div className="topics-inspector-header">
            <div className="inspector-title-group">
              <span className="eyebrow coral">Syllabus & Concept Hierarchy</span>
              <h2>{activeCourse.name}</h2>
              <p>
                Browse topic concepts, jump straight into targeted problem solving, or add custom topics.
              </p>
            </div>

            <button
              type="button"
              className="icon-button close-inspector-btn"
              onClick={() => setSelectedCourseId("")}
              aria-label="Close topic inspector"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search within concepts if there are many */}
          {concepts.length > 5 && (
            <div className="topics-search-wrap">
              <Search size={15} />
              <input
                type="search"
                aria-label="Search course concepts"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                placeholder="Filter topics in this course…"
                className="topics-search-input"
              />
              {topicSearch && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setTopicSearch("")}
                  aria-label="Clear topic search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Topics List */}
          <ul className="course-topics-list" aria-label="Topics in this course">
            {concepts
              .filter((c) =>
                topicSearch ? c.name.toLowerCase().includes(topicSearch.toLowerCase()) : true
              )
              .map((c, index) => (
                <li key={c.concept_id} className="course-topic-row">
                  <div className="topic-meta-group">
                    <span className="topic-index-badge">{index + 1}</span>
                    <span className="topic-name">{c.name}</span>
                  </div>

                  <button
                    type="button"
                    className="primary-button learn-topic-btn"
                    onClick={() =>
                      onLearn({
                        courseId: selectedCourseId,
                        conceptId: c.concept_id,
                        conceptName: c.name,
                      })
                    }
                    title={`Start practice on ${c.name}`}
                  >
                    <span>Practice Topic</span>
                    <ArrowRight size={14} />
                  </button>
                </li>
              ))}
          </ul>

          {concepts.length === 0 && (
            <div className="empty-topics-notice">
              <p>No individual concepts mapped yet. Add your first topic below to begin structured practice.</p>
            </div>
          )}

          {/* Add custom topic form for owner on user-defined subjects */}
          {activeCourse.membership === "owner" &&
            activeCourse.subject_id.startsWith("USR:") && (
              <form className="add-topic-inline-form" onSubmit={handleAddTopic}>
                <input
                  aria-label="New topic name"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Enter a new concept or chapter topic (e.g. Byzantine Fault Tolerance)"
                  disabled={busy}
                  className="add-topic-input"
                />
                <button
                  type="submit"
                  className="secondary-button add-topic-btn"
                  disabled={busy || !topicInput.trim()}
                >
                  <Plus size={15} />
                  <span>Add Topic</span>
                </button>
              </form>
            )}

          {!activeCourse.subject_id.startsWith("USR:") && (
            <div className="curated-subject-note">
              <Sparkles size={16} />
              <p>
                This subject belongs to the shared institutional catalog. Its concepts and learning dependencies
                are curated and verified. To customize topics, create a course under <em>"New subject"</em>.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
