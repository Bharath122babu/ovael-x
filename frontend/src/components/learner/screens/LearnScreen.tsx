import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  HelpCircle,
  Layers3,
  Lightbulb,
  Mic,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  ScanText,
  Send,
  Sparkles,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { useTeaching } from "../../../context/TeachingContext";
import { api } from "../../../api";
import { ovaelApi } from "../../../api/client";
import type { LearnerScreen, LearningLaunch } from "../../../types";
import { RichText } from "../../content/RichText";
import { DrawingPad } from "../../content/DrawingPad";
import { VoiceInput } from "../../content/VoiceInput";
import { IllustrationPanel } from "../../content/IllustrationPanel";
import { KnowledgeNetworkGraphic } from "../../content/KnowledgeNetworkGraphic";

type Concept = { concept_id: string; name: string };

export function LearnScreen({
  onNavigate,
  launch,
}: {
  onNavigate?: (screen: LearnerScreen) => void;
  launch?: LearningLaunch | null;
}) {
  const { user, profile, courses, map, sessions, loading, refresh, setError } = useOvael();
  const t = useTeaching();

  const [courseId, setCourseId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [goal, setGoal] = useState("");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [draw, setDraw] = useState(false);
  const [attachments, setAttachments] = useState(false);
  const [intent, setIntent] = useState<"answer" | "ask_question">("ask_question");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const audio = useRef<HTMLInputElement>(null);
  const materialInput = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [illustrations, setIllustrations] = useState(false);
  const tail = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expanding composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 180);
    el.style.height = `${nextHeight}px`;
  }, [t.answer, goal]);

  // Auto-scroll on new entries or active generation
  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [t.entries.length, t.busy]);

  // Synchronize intent with move question type
  useEffect(() => {
    const hasQuestion =
      (t.session?.move?.options?.length || 0) > 0 ||
      t.session?.move?.answer_type === "numeric" ||
      t.session?.move?.answer_type === "boolean" ||
      t.session?.move?.answer_type === "code";
    setIntent(hasQuestion ? "answer" : "ask_question");
  }, [t.session?.move?.move_id, t.session?.move?.options?.length, t.session?.move?.answer_type]);

  const file = useRef<HTMLInputElement>(null);
  const course = courses.find((c) => c.course_id === courseId);

  // Synchronize launch parameters from other screens
  useEffect(() => {
    const next =
      launch?.courseId ||
      courses.find((c) => c.subject_id === launch?.subjectId)?.course_id;
    if (next) setCourseId(next);
    else if (launch?.subjectId) setCourseId("");
    else if (!courseId && courses.length) setCourseId(courses[0].course_id);
    if (launch?.conceptId) setConceptId(launch.conceptId);
  }, [launch, courses, courseId]);

  // Load concepts for selected course
  useEffect(() => {
    let cancelled = false;
    setConcepts([]);
    if (!courseId) {
      setTopicsLoading(false);
      const rows = launch?.subjectId
        ? map.nodes
            .filter((n) => n.subject_id === launch.subjectId)
            .map((n) => ({ concept_id: n.id, name: n.label }))
        : [];
      if (
        launch?.conceptId &&
        !rows.some((n) => n.concept_id === launch.conceptId)
      ) {
        rows.push({
          concept_id: launch.conceptId,
          name: launch.conceptName || launch.conceptId,
        });
      }
      setConcepts(rows);
      setConceptId((old) =>
        rows.some((n) => n.concept_id === old)
          ? old
          : rows[0]?.concept_id || "",
      );
      return;
    }

    setTopicsLoading(true);
    void api(`/v1/courses/${courseId}/concepts`)
      .then((rows: Concept[]) => {
        if (cancelled) return;
        setConcepts(rows);
        setConceptId((old) =>
          rows.some((c) => c.concept_id === old)
            ? old
            : rows[0]?.concept_id || "",
        );
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, launch?.subjectId, launch?.conceptId, launch?.conceptName, map.nodes, setError]);

  const target = concepts.find((c) => c.concept_id === conceptId);
  const subjectId = course?.subject_id || launch?.subjectId;
  const label =
    target?.name ||
    launch?.conceptName ||
    map.nodes.find((n) => n.id === conceptId)?.label ||
    "Choose your next idea";

  const session = t.session;
  const move = session?.move;
  const disabled = t.busy || t.pending || uploading;

  // Material upload handler
  async function uploadMaterials(files: File[]) {
    if (!files.length || uploadLock.current || disabled) return;
    if (files.some((f) => f.size > 50 * 1024 * 1024)) {
      setError("Choose files of 50 MB or smaller each.");
      return;
    }
    const selectedCourse = courses.find(
      (item) => item.course_id === (session?.course_id || courseId),
    );
    const ownerCourseId =
      selectedCourse?.membership === "owner" ? selectedCourse.course_id : undefined;

    uploadLock.current = true;
    setUploading(true);
    setError("");
    const results: string[] = [];

    try {
      for (const [index, f] of files.entries()) {
        setUploadNotice(`Uploading ${f.name} (${index + 1}/${files.length})…`);
        try {
          const document = await ovaelApi.uploadDocument(f, ownerCourseId, !ownerCourseId);
          const status =
            document.status === "ready"
              ? "ready to use"
              : document.status === "ready_partial"
                ? "partly read; continue in Materials"
                : document.status === "failed_retryable"
                  ? "needs processing; retry in Materials"
                  : "check processing in Materials";
          results.push(`${f.name}: ${status}`);
        } catch (error) {
          results.push(`${f.name}: upload failed`);
          setError(error instanceof Error ? error.message : "Material upload failed.");
        }
      }
      setUploadNotice(results.join(" · "));
      await refresh();
    } finally {
      uploadLock.current = false;
      setUploading(false);
    }
  }

  const evaluation = session?.evidence?.evaluation as
    | {
        status?: string;
        needs_review_reason?: string;
        feedback?: string;
        correct?: boolean | null;
        score?: number | null;
      }
    | undefined;

  async function start(startMode: "study" | "practice" | "review") {
    if (!subjectId || !conceptId) {
      setError("Choose a course and topic first.");
      return;
    }
    await t.start({
      subject_id: subjectId,
      concept_id: conceptId,
      course_id: course?.course_id,
      mode: startMode,
      goal: goal.trim() || `Understand ${label}`,
    });
  }

  const openedLaunch = useRef<LearningLaunch | null>(null);
  useEffect(() => {
    if (
      !launch ||
      openedLaunch.current === launch ||
      !conceptId ||
      !subjectId ||
      topicsLoading ||
      disabled
    )
      return;

    if (launch.courseId && launch.courseId !== courseId) return;
    if (launch.subjectId && launch.subjectId !== subjectId) return;
    if (launch.conceptId && launch.conceptId !== conceptId) return;

    openedLaunch.current = launch;
    void t.start(
      {
        subject_id: subjectId,
        concept_id: conceptId,
        course_id: course?.course_id,
        mode: launch.mode || "study",
        goal: launch.documentName
          ? `Explain ${label} using ${launch.documentName}`
          : `Understand ${label}`,
      },
      true,
    );
  }, [launch, conceptId, subjectId, topicsLoading, disabled, courseId, course?.course_id, label, t]);

  const questionReady = session
    ? Boolean(
        t.answer.trim() ||
        (intent === "answer" && (t.choice !== null || t.transcript)),
      )
    : Boolean(goal.trim() && conceptId && subjectId);

  async function submit() {
    if (disabled || !questionReady) return;
    if (session) await t.send(intent);
    else await start("study");
  }

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback silently
    }
  };

  const selectors = (
    <div className="chat-selectors-card" role="group" aria-label="Course and Topic Selection">
      <div className="chat-selector-field">
        <label htmlFor="chat-course-select" className="selector-label">
          <Layers3 size={15} className="selector-icon" />
          <span>Course</span>
        </label>
        <select
          id="chat-course-select"
          aria-label="Select course"
          value={courseId}
          disabled={topicsLoading || disabled}
          onChange={(e) => {
            setCourseId(e.target.value);
            setConceptId("");
          }}
          className="styled-select"
        >
          <option value="">Choose a course</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="chat-selector-field">
        <label htmlFor="chat-topic-select" className="selector-label">
          <BookOpen size={15} className="selector-icon" />
          <span>Learning Topic</span>
          {concepts.length > 0 && (
            <span className="concept-count-pill">{concepts.length}</span>
          )}
        </label>
        <select
          id="chat-topic-select"
          aria-label="Select topic"
          value={conceptId}
          disabled={topicsLoading || disabled}
          onChange={(e) => setConceptId(e.target.value)}
          className="styled-select"
        >
          <option value="">
            {topicsLoading ? "Loading topics…" : "Choose a topic"}
          </option>
          {concepts.map((c) => (
            <option key={c.concept_id} value={c.concept_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="chat-workspace">
      {/* Workspace Header */}
      <header className="chat-heading">
        <div className="chat-heading-info">
          <span className="chat-heading-eyebrow">
            {course?.name || "Evidence-Grounded Learning"}
          </span>
          <h2 className="chat-heading-title">
            {session
              ? map.nodes.find((n) => n.id === session.concept_id)?.label ||
                session.goal?.replace(/^Understand /, "") ||
                "Conversation"
              : "New Learning Session"}
          </h2>
        </div>

        <div className="chat-heading-actions">
          {session && (
            <button
              type="button"
              className="secondary-button compact new-chat-btn"
              disabled={disabled}
              onClick={() => void t.finish()}
              title="Start a new learning session"
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Recoverable Notice Banner */}
      {t.notice && (
        <div className="chat-notice-pill" role="status">
          <span>{t.notice}</span>
        </div>
      )}

      {/* Pending Unconfirmed Turn Recovery */}
      {t.pending && (
        <div className="chat-recovery-banner" role="alert">
          <div className="recovery-copy">
            <strong>Unconfirmed Message:</strong>
            <span>Your previous turn needs confirmation to be safely stored in local memory.</span>
          </div>
          <button
            type="button"
            className="secondary-button compact"
            disabled={t.busy}
            onClick={() => void t.recover()}
          >
            <RefreshCw size={14} className={t.busy ? "spin-icon" : ""} />
            <span>Retry message</span>
          </button>
        </div>
      )}

      {/* Main Chat Scroll Container */}
      <div className="chat-scroll">
        {!session ? (
          <section className="chat-welcome">
            <div className="welcome-hero">
              <KnowledgeNetworkGraphic size={190} />
              <div className="welcome-greeting">
                <span className="eyebrow blue">
                  {user ? `Welcome, ${profile?.display_name || user.username}` : "Evidence-Grounded Learning"}
                </span>
                <h1>What would you like to explore today?</h1>
                <p>
                  Explore your courses with causal explanations, practice targeted questions,
                  or synthesize new concepts from your notes.
                </p>
              </div>
            </div>

            {/* Overview Stats Strip */}
            {courses.length > 0 && (
              <div className="welcome-stats-strip" aria-label="Learning overview stats">
                <div className="stat-pill">
                  <strong>{courses.length}</strong>
                  <span>Active Course{courses.length === 1 ? "" : "s"}</span>
                </div>
                <div className="stat-pill">
                  <strong>{map.nodes.length}</strong>
                  <span>Knowledge Node{map.nodes.length === 1 ? "" : "s"}</span>
                </div>
                <div className="stat-pill">
                  <strong>{sessions.length}</strong>
                  <span>Practice Session{sessions.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            )}

            {/* Course & Topic Selection */}
            {selectors}

            {!courses.length && !loading && (
              <div className="empty-courses-card">
                <p>You have not created or enrolled in any courses yet.</p>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => onNavigate?.("courses")}
                >
                  <Plus size={15} />
                  <span>Create your first course</span>
                </button>
              </div>
            )}

            {/* Action Cards */}
            <div className="chat-suggestions">
              <button
                type="button"
                className="suggestion-card"
                disabled={!conceptId || disabled}
                onClick={() => void start("study")}
              >
                <div className="suggestion-icon-wrap study-icon">
                  <BookOpen size={18} />
                </div>
                <div className="suggestion-text">
                  <strong>Explain a concept</strong>
                  <span>Grounded breakdown of {label}</span>
                </div>
                <span className="suggestion-action-arrow">
                  <ArrowRight size={14} />
                </span>
              </button>

              <button
                type="button"
                className="suggestion-card"
                disabled={!conceptId || disabled}
                onClick={() => void start("practice")}
              >
                <div className="suggestion-icon-wrap practice-icon">
                  <Lightbulb size={18} />
                </div>
                <div className="suggestion-text">
                  <strong>Practice with me</strong>
                  <span>Solve a question to check your understanding</span>
                </div>
                <span className="suggestion-action-arrow">
                  <ArrowRight size={14} />
                </span>
              </button>

              <button
                type="button"
                className="suggestion-card"
                onClick={() => onNavigate?.("materials")}
              >
                <div className="suggestion-icon-wrap material-icon">
                  <Paperclip size={18} />
                </div>
                <div className="suggestion-text">
                  <strong>Use my materials</strong>
                  <span>Synthesize notes, textbooks, slides, audio</span>
                </div>
                <span className="suggestion-action-arrow">
                  <ArrowRight size={14} />
                </span>
              </button>
            </div>
          </section>
        ) : (
          <div className="chat-messages" aria-live="polite" aria-busy={t.busy}>
            {/* Optional Illustration Panel */}
            {illustrations && (
              <IllustrationPanel
                key={session.concept_id}
                topic={
                  map.nodes.find((node) => node.id === session.concept_id)?.label || label
                }
              />
            )}

            {/* Conversation Entries */}
            {t.entries.map((entry) => (
              <article key={entry.id} className={`chat-message ${entry.who}`}>
                {entry.who === "ovael" && (
                  <span className="message-avatar" aria-label="OVAEL-X AI Assistant">
                    O
                  </span>
                )}
                <div className="message-content">
                  {entry.who === "ovael" ? (
                    <>
                      <RichText
                        markdown={
                          entry.text.startsWith("No verified teaching content is available")
                            ? "I need material for this topic to explain it. Add your notes, or choose a practice question."
                            : entry.text.startsWith("AI explanation is unavailable")
                              ? "From your course material:\n\n" +
                                entry.text
                                  .split("\n\n")
                                  .slice(1)
                                  .join("\n\n")
                                  .replace(/^\[[A-Z_]+ \| (.+)\]$/gm, "*Source: $1*")
                              : entry.text
                        }
                      />
                      {entry.text.startsWith("No verified teaching content is available") && (
                        <button
                          type="button"
                          className="secondary-button compact add-materials-cta"
                          onClick={() => onNavigate?.("materials")}
                        >
                          <span>Add course materials</span>
                          <ArrowRight size={14} />
                        </button>
                      )}

                      {/* Message Actions Row */}
                      <footer className="message-actions-row">
                        <button
                          type="button"
                          className="copy-message-btn"
                          aria-label={copiedId === entry.id ? "Copied" : "Copy response"}
                          onClick={() => void handleCopyMessage(entry.id, entry.text)}
                          title="Copy response to clipboard"
                        >
                          {copiedId === entry.id ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copiedId === entry.id ? "Copied" : "Copy"}</span>
                        </button>
                      </footer>
                    </>
                  ) : (
                    <div className="learner-bubble">
                      <p>{entry.text}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {/* Assessment Evaluation Banner */}
            {evaluation && (
              <div
                className={`chat-feedback-card ${
                  evaluation.status === "graded"
                    ? evaluation.correct
                      ? "is-correct"
                      : "needs-review"
                    : "is-saved"
                }`}
                role="status"
              >
                <div className="feedback-badge">
                  {evaluation.status === "graded" ? (
                    evaluation.correct ? (
                      <>
                        <CheckCircle2 size={16} className="feedback-icon" />
                        <strong>Verified Correct</strong>
                      </>
                    ) : (
                      <>
                        <HelpCircle size={16} className="feedback-icon" />
                        <strong>Let's Review This Idea</strong>
                      </>
                    )
                  ) : (
                    <>
                      <Sparkles size={16} className="feedback-icon" />
                      <strong>Response Saved</strong>
                    </>
                  )}
                </div>
                {(evaluation.feedback || evaluation.needs_review_reason) && (
                  <p className="feedback-explanation">
                    {evaluation.feedback || evaluation.needs_review_reason}
                  </p>
                )}
              </div>
            )}

            {/* Assessment Question Options (MCQ) */}
            {(move?.options?.length || 0) > 0 && (
              <fieldset className="chat-options-container">
                <legend className="options-legend">Choose your answer:</legend>
                <div className="options-grid">
                  {move?.options?.map((option, index) => {
                    const isSelected = t.choice === index;
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <label
                        key={index}
                        className={`option-card ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="assessment-choice"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => {
                            t.setChoice(index);
                            setIntent("answer");
                          }}
                        />
                        <span className="option-letter">{letter}</span>
                        <span className="option-text">{option}</span>
                        {isSelected && (
                          <span className="option-check-indicator" aria-hidden="true">
                            <Check size={14} />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Source Citations Disclosure */}
            {move?.citations?.length ? (
              <details className="chat-sources-disclosure">
                <summary>
                  <BookOpen size={14} />
                  <span>Verified Sources ({move.citations.length})</span>
                </summary>
                <ul>
                  {move.citations.map((citation, index) => (
                    <li key={index}>{citation}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {/* Thinking / Generation Indicator */}
            {t.busy && (
              <div className="chat-thinking-card" role="status">
                <div className="thinking-avatar">O</div>
                <div className="thinking-content">
                  <span>OVAEL-X is thinking</span>
                  <span className="pulse-dots">···</span>
                </div>
              </div>
            )}

            <div ref={tail} />
          </div>
        )}
      </div>

      {/* Input & Composer Region */}
      <div className="chat-input-area">
        {/* Material Upload Status Notice */}
        {uploadNotice && (
          <div className="chat-upload-notice" role="status">
            <span>{uploadNotice}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate?.("materials")}
            >
              <span>View in Materials</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Speech Recording Review Draft */}
        {t.speechDraft !== null && (
          <section className="chat-review-card" aria-label="Review voice recording">
            <header className="review-header">
              <Mic size={16} />
              <strong>Review Your Spoken Answer</strong>
            </header>
            <textarea
              className="review-textarea"
              value={t.speechDraft}
              onChange={(e) => t.setSpeechDraft(e.target.value)}
              disabled={disabled}
              rows={3}
            />
            <footer className="review-footer">
              <button
                type="button"
                className="secondary-button compact"
                onClick={() => t.setSpeechDraft(null)}
              >
                Discard
              </button>
              <button
                type="button"
                className="primary-button compact"
                disabled={disabled || !t.speechDraft.trim()}
                onClick={() => {
                  if (session) t.approveSpeech();
                  else {
                    setGoal(t.speechDraft?.trim() || "");
                    t.setSpeechDraft(null);
                  }
                }}
              >
                <Check size={14} />
                <span>Use this text</span>
              </button>
            </footer>
          </section>
        )}

        {/* Image OCR Handwriting / Text Review */}
        {t.transcript && (
          <section className="chat-review-card" aria-label="Review extracted text">
            <header className="review-header">
              <ScanText size={16} />
              <strong>Review Extracted Handwriting / Text</strong>
            </header>
            <textarea
              className="review-textarea"
              value={t.transcript.text}
              disabled={disabled}
              rows={3}
              onChange={(e) => {
                t.setTranscript({ ...t.transcript!, text: e.target.value });
                t.setApproved(false);
              }}
            />
            <footer className="review-footer">
              <label className="checkbox-confirm-label">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={t.approved}
                  onChange={(e) => t.setApproved(e.target.checked)}
                />
                <span>This extracted text is correct</span>
              </label>
            </footer>
          </section>
        )}

        {/* Interactive Chat Tools Strip */}
        {session && (
          <div className="chat-tools-bar">
            {/* Mode Switcher */}
            <div className="composer-modes-pill" role="tablist" aria-label="Response Mode">
              <button
                type="button"
                role="tab"
                aria-selected={intent === "ask_question"}
                className={`mode-btn ${intent === "ask_question" ? "active" : ""}`}
                onClick={() => setIntent("ask_question")}
              >
                Ask
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={intent === "answer"}
                className={`mode-btn ${intent === "answer" ? "active" : ""}`}
                onClick={() => setIntent("answer")}
              >
                Answer
              </button>
            </div>

            {/* Quick Socratic Actions */}
            {move?.content_status !== "unavailable" && (
              <div className="socratic-actions">
                <button
                  type="button"
                  className="tool-btn"
                  disabled={disabled}
                  onClick={() => void t.send("example")}
                  title="Show a concrete example"
                >
                  <Sparkles size={13} />
                  <span>Example</span>
                </button>
                <button
                  type="button"
                  className="tool-btn"
                  disabled={disabled}
                  onClick={() => void t.send("slow_down")}
                  title="Deconstruct the explanation step-by-step"
                >
                  <span>Break it down</span>
                </button>
                <button
                  type="button"
                  className="tool-btn"
                  disabled={disabled}
                  onClick={() => void t.send("practice")}
                  title="Generate a targeted practice question"
                >
                  <Lightbulb size={13} />
                  <span>Practice</span>
                </button>
              </div>
            )}

            {/* Visual Illustration Panel Toggle */}
            <button
              type="button"
              className="tool-btn illustration-toggle"
              onClick={() => setIllustrations(!illustrations)}
            >
              <span>{illustrations ? "Hide illustration" : "Illustration"}</span>
            </button>
          </div>
        )}

        {/* Main Composer Box */}
        <form
          className="chat-composer-box"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {/* Boolean True / False Selection */}
          {session && move?.answer_type === "boolean" && intent === "answer" ? (
            <div className="boolean-choice-wrapper" role="radiogroup" aria-label="True or False response">
              <span className="boolean-prompt">Select response:</span>
              <button
                type="button"
                role="radio"
                aria-checked={t.answer === "true"}
                className={`boolean-choice-btn ${t.answer === "true" ? "selected" : ""}`}
                disabled={disabled}
                onClick={() => t.setAnswer("true")}
              >
                <span>True</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={t.answer === "false"}
                className={`boolean-choice-btn ${t.answer === "false" ? "selected" : ""}`}
                disabled={disabled}
                onClick={() => t.setAnswer("false")}
              >
                <span>False</span>
              </button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              aria-label={session ? "Message OVAEL-X" : "Start a learning conversation"}
              rows={1}
              value={session ? t.answer : goal}
              disabled={disabled}
              onChange={(e) =>
                session ? t.setAnswer(e.target.value) : setGoal(e.target.value)
              }
              placeholder={
                intent === "answer" && session
                  ? move?.answer_type === "mcq"
                    ? "Choose an option above…"
                    : move?.answer_type === "numeric"
                      ? "Enter a number or decimal (e.g. 42 or 3.14)…"
                      : move?.answer_type === "code"
                        ? "Write your code solution…"
                        : "Write your answer…"
                  : session
                    ? "Message OVAEL-X…"
                    : "What would you like to understand about this topic?"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="chat-textarea"
            />
          )}

          {/* Composer Controls Bottom Strip */}
          <div className="composer-bottom-bar">
            {/* Attachment Menu Popover */}
            <div className="attachment-wrap">
              <button
                type="button"
                className="icon-button attachment-trigger-btn"
                aria-label="Add attachment or input method"
                aria-expanded={attachments}
                disabled={disabled}
                onClick={() => setAttachments(!attachments)}
                title="Attach files, OCR, or drawings"
              >
                <Plus size={18} />
              </button>
              {attachments && (
                <div className="attachment-menu-popover" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={() => {
                      setAttachments(false);
                      materialInput.current?.click();
                    }}
                  >
                    <Paperclip size={16} />
                    <div>
                      <strong>Upload study materials</strong>
                      <small>PDF, books, notes, audio, video (50 MB)</small>
                    </div>
                  </button>
                  {session && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          file.current?.click();
                        }}
                      >
                        <ScanText size={16} />
                        <div>
                          <strong>Answer from an image</strong>
                          <small>Extract handwritten text / diagrams</small>
                        </div>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          audio.current?.click();
                        }}
                      >
                        <Mic size={16} />
                        <div>
                          <strong>Upload recorded audio</strong>
                          <small>WAV, MP3, M4A, WebM speech</small>
                        </div>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          setDraw(true);
                        }}
                      >
                        <PenLine size={16} />
                        <div>
                          <strong>Draw an answer</strong>
                          <small>Sketch equations or diagrams</small>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <span className="composer-tip">
              {session ? "Shift + Enter for a new line" : "Select a course and topic above"}
            </span>

            <div className="composer-right-actions">
              {/* Voice Microphone Input */}
              <VoiceInput
                disabled={disabled}
                onAudio={t.transcribeAudio}
                onError={setError}
              />

              {/* Send Button */}
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
                disabled={disabled || !questionReady}
                title={
                  disabled
                    ? "Processing…"
                    : !questionReady
                      ? "Type an answer or question to continue"
                      : "Send message (Enter)"
                }
              >
                {t.busy ? (
                  <RefreshCw size={17} className="spin-icon" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Hidden File Input Handlers */}
        <input
          ref={materialInput}
          type="file"
          className="sr-only"
          multiple
          aria-label="Upload learning materials"
          accept=".pdf,.epub,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
          onChange={(e) => {
            void uploadMaterials(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        <input
          ref={file}
          type="file"
          className="sr-only"
          accept="image/*"
          aria-label="Upload image for OCR"
          onChange={(e) => {
            const img = e.target.files?.[0];
            if (img) void t.extract(img);
            e.target.value = "";
          }}
        />
        <input
          ref={audio}
          type="file"
          className="sr-only"
          accept=".wav,.mp3,.m4a,.webm"
          aria-label="Upload audio recording"
          onChange={(e) => {
            const recording = e.target.files?.[0];
            if (recording) void t.transcribeAudio(recording);
            e.target.value = "";
          }}
        />
      </div>

      {/* Drawing Pad Modal */}
      {draw && (
        <DrawingPad
          onClose={() => setDraw(false)}
          onDone={(image) => {
            setDraw(false);
            void t.extract(image);
          }}
        />
      )}
    </div>
  );
}
