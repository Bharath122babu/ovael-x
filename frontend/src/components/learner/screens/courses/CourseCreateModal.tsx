import { useState, useRef } from "react";
import {
  X,
  Upload,
  BookOpen,
  FolderPlus,
  Compass,
  FileText,
  Plus,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../../api";
import { ovaelApi } from "../../../../api/client";
import { topicMermaid } from "../../../../learningVisuals";
import type { Subject } from "../../../../types";

export interface CourseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  refresh: () => Promise<void>;
  setError: (msg: string) => void;
  setNotice: (msg: string) => void;
  onCourseCreated: (courseId: string) => void;
}

export function CourseCreateModal({
  isOpen,
  onClose,
  subjects,
  refresh,
  setError,
  setNotice,
  onCourseCreated,
}: CourseCreateModalProps) {
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
  const booksInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      onCourseCreated(c.course_id);
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
      onClose();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Course creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
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
          onClick={onClose}
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
            onClick={onClose}
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
  );
}
