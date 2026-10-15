import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  Send,
  ScanText,
  PenLine,
  Plus,
  Mic,
  Paperclip,
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
  const { user, profile, courses, map, sessions, loading, refresh, setError } = useOvael(),
    t = useTeaching();
  const [courseId, setCourseId] = useState(""),
    [conceptId, setConceptId] = useState(""),
    [concepts, setConcepts] = useState<Concept[]>([]),
    [goal, setGoal] = useState(""),
    [topicsLoading, setTopicsLoading] = useState(false),
    [draw, setDraw] = useState(false),
    [attachments, setAttachments] = useState(false),
    [intent, setIntent] = useState<"answer" | "ask_question">("ask_question");
  const audio = useRef<HTMLInputElement>(null);
  const materialInput = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [illustrations, setIllustrations] = useState(false);
  const tail = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 180);
    el.style.height = `${nextHeight}px`;
  }, [t.answer, goal]);
  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [t.entries, t.busy]);
  useEffect(() => {
    setIntent(
      t.session?.move?.options?.length ||
        t.session?.move?.answer_type === "numeric" ||
        t.session?.move?.answer_type === "boolean" ||
        t.session?.move?.answer_type === "code"
        ? "answer"
        : "ask_question",
    );
  }, [t.session?.move?.move_id]);
  const file = useRef<HTMLInputElement>(null),
    course = courses.find((c) => c.course_id === courseId);
  useEffect(() => {
    const next =
      launch?.courseId ||
      courses.find((c) => c.subject_id === launch?.subjectId)?.course_id;
    if (next) setCourseId(next);
    else if (launch?.subjectId) setCourseId("");
    else if (!courseId && courses.length) setCourseId(courses[0].course_id);
    if (launch?.conceptId) setConceptId(launch.conceptId);
  }, [launch, courses]);
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
      )
        rows.push({
          concept_id: launch.conceptId,
          name: launch.conceptName || launch.conceptId,
        });
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
  }, [courseId, launch?.subjectId, map.nodes, setError]);
  const target = concepts.find((c) => c.concept_id === conceptId),
    subjectId = course?.subject_id || launch?.subjectId;
  const label =
    target?.name ||
    launch?.conceptName ||
    map.nodes.find((n) => n.id === conceptId)?.label ||
    "Choose your next idea";
  const session = t.session,
    move = session?.move,
    disabled = t.busy || t.pending || uploading;
  async function uploadMaterials(files: File[]) {
    if (!files.length || uploadLock.current || disabled) return;
    if (files.some((file) => file.size > 50 * 1024 * 1024)) {
      setError("Choose files of 50 MB or smaller each.");
      return;
    }
    const selectedCourse = courses.find((item) => item.course_id === (session?.course_id || courseId));
    const ownerCourseId = selectedCourse?.membership === "owner" ? selectedCourse.course_id : undefined;
    uploadLock.current = true;
    setUploading(true);
    setError("");
    const results: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setUploadNotice(`Adding ${file.name} (${index + 1}/${files.length})…`);
        try {
          const document = await ovaelApi.uploadDocument(file, ownerCourseId, !ownerCourseId);
          const status = document.status === "ready" ? "ready to use" : document.status === "ready_partial" ? "partly read; continue in Materials" : document.status === "failed_retryable" ? "needs processing; retry in Materials" : "check processing in Materials";
          results.push(`${file.name}: ${status}`);
        } catch (error) {
          results.push(`${file.name}: upload failed`);
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
  async function start(mode: "study" | "practice" | "review") {
    if (!subjectId || !conceptId) {
      setError("Choose a course and topic first.");
      return;
    }
    await t.start({
      subject_id: subjectId,
      concept_id: conceptId,
      course_id: course?.course_id,
      mode,
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
  }, [launch, conceptId, subjectId, topicsLoading, disabled, courseId]);
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
  const selectors = (
    <div className="chat-selectors">
      <label>
        <span>Course</span>
        <select
          aria-label="Chat course"
          value={courseId}
          disabled={topicsLoading || disabled}
          onChange={(e) => {
            setCourseId(e.target.value);
            setConceptId("");
          }}
        >
          <option value="">Choose a course</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Topic</span>
        <select
          aria-label="Chat topic"
          value={conceptId}
          disabled={topicsLoading || disabled}
          onChange={(e) => setConceptId(e.target.value)}
        >
          <option value="">
            {topicsLoading ? "Loading…" : "Choose a topic"}
          </option>
          {concepts.map((c) => (
            <option key={c.concept_id} value={c.concept_id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  return (
    <div className="chat-workspace">
      <header className="chat-heading">
        <div>
          <strong>
            {session
              ? map.nodes.find((n) => n.id === session.concept_id)?.label ||
                session.goal?.replace(/^Understand /, "") ||
                "Conversation"
              : "New conversation"}
          </strong>
          <span>OVAEL-X</span>
        </div>
        {session && (
          <button
            className="quiet-button"
            disabled={disabled}
            onClick={() => void t.finish()}
          >
            <Plus size={16} /> New chat
          </button>
        )}
      </header>
      {t.notice && (
        <p className="chat-notice" role="status">
          {t.notice}
        </p>
      )}
      {t.pending && (
        <div className="chat-notice" role="alert">
          Your message needs confirmation.{" "}
          <button disabled={t.busy} onClick={() => void t.recover()}>
            Retry message
          </button>
        </div>
      )}
      <div className="chat-scroll">
        {!session ? (
          <section className="chat-welcome">
            <div className="welcome-hero">
              <KnowledgeNetworkGraphic size={200} />
              <div className="welcome-greeting">
                <p className="eyebrow blue">
                  {user ? `Welcome, ${profile?.display_name || user.username}` : "Evidence-grounded learning"}
                </p>
                <h1>What would you like to learn today?</h1>
                <p>Ask a question, work through problems, or explore with your notes.</p>
              </div>
            </div>

            {courses.length > 0 && (
              <div className="welcome-stats-strip" aria-label="Learning overview">
                <div className="stat-pill">
                  <strong>{courses.length}</strong>
                  <span>Active course{courses.length === 1 ? "" : "s"}</span>
                </div>
                <div className="stat-pill">
                  <strong>{map.nodes.length}</strong>
                  <span>Knowledge node{map.nodes.length === 1 ? "" : "s"}</span>
                </div>
                <div className="stat-pill">
                  <strong>{sessions.length}</strong>
                  <span>Practice session{sessions.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            )}

            {selectors}
            {!courses.length && !loading && (
              <button
                className="text-button"
                onClick={() => onNavigate?.("courses")}
              >
                Create a course
              </button>
            )}
            <div className="chat-suggestions">
              <button
                disabled={!conceptId || disabled}
                onClick={() => void start("study")}
              >
                <BookOpen size={18} />
                <strong>Explain a topic</strong>
                <span>{label}</span>
              </button>
              <button
                disabled={!conceptId || disabled}
                onClick={() => void start("practice")}
              >
                <Lightbulb size={18} />
                <strong>Practice with me</strong>
                <span>Try a question</span>
              </button>
              <button onClick={() => onNavigate?.("materials")}>
                <Paperclip size={18} />
                <strong>Use my material</strong>
                <span>Notes, images, audio or video</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="chat-messages" aria-live="polite" aria-busy={t.busy}>
            {illustrations && (
              <IllustrationPanel
                key={session.concept_id}
                topic={
                  map.nodes.find((node) => node.id === session.concept_id)
                    ?.label || label
                }
              />
            )}
            {t.entries.map((entry) => (
              <article key={entry.id} className={`chat-message ${entry.who}`}>
                {entry.who === "ovael" && (
                  <span className="message-avatar" aria-label="OVAEL-X">
                    O
                  </span>
                )}
                <div className="message-content">
                  {entry.who === "ovael" ? (
                    <>
                      <RichText
                        markdown={
                          entry.text.startsWith(
                            "No verified teaching content is available",
                          )
                            ? "I need material for this topic to explain it. Add your notes, or choose a practice question."
                            : entry.text.startsWith(
                                  "AI explanation is unavailable",
                                )
                              ? "From your course material:\n\n" +
                                entry.text
                                  .split("\n\n")
                                  .slice(1)
                                  .join("\n\n")
                                  .replace(
                                    /^\[[A-Z_]+ \| (.+)\]$/gm,
                                    "*Source: $1*",
                                  )
                              : entry.text
                        }
                      />
                      {entry.text.startsWith(
                        "No verified teaching content is available",
                      ) && (
                        <button
                          className="text-button"
                          onClick={() => onNavigate?.("materials")}
                        >
                          Add material <ArrowRight size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <p>{entry.text}</p>
                  )}
                </div>
              </article>
            ))}
            {evaluation && (
              <p className="chat-feedback">
                <strong>
                  {evaluation.status === "graded"
                    ? evaluation.correct
                      ? "Correct."
                      : "Let's try again."
                    : "Saved."}
                </strong>{" "}
                {evaluation.feedback || evaluation.needs_review_reason || ""}
              </p>
            )}
            {(move?.options?.length || 0) > 0 && (
              <fieldset className="chat-options">
                <legend>Your answer</legend>
                {move?.options?.map((option, index) => (
                  <label
                    key={index}
                    className={t.choice === index ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="assessment-choice"
                      checked={t.choice === index}
                      disabled={disabled}
                      onChange={() => {
                        t.setChoice(index);
                        setIntent("answer");
                      }}
                    />
                    <span>
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {move?.citations?.length ? (
              <details className="chat-sources">
                <summary>Sources</summary>
                <ul>
                  {move.citations.map((citation, index) => (
                    <li key={index}>{citation}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            {t.busy && (
              <div className="chat-thinking" role="status">
                OVAEL-X is thinking<span>···</span>
              </div>
            )}
            <div ref={tail} />
          </div>
        )}
      </div>
      <div className="chat-input-area">
        {uploadNotice && <div className="chat-upload-notice" role="status"><span>{uploadNotice}</span><button type="button" className="text-button" onClick={() => onNavigate?.("materials")}>View materials <ArrowRight size={14}/></button></div>}
        {t.speechDraft !== null && (
          <section className="chat-review">
            <label>
              Review your recording
              <textarea
                value={t.speechDraft}
                onChange={(e) => t.setSpeechDraft(e.target.value)}
                disabled={disabled}
              />
            </label>
            <button
              className="secondary-button"
              disabled={disabled || !t.speechDraft.trim()}
              onClick={() => {
                if (session) t.approveSpeech();
                else {
                  setGoal(t.speechDraft?.trim() || "");
                  t.setSpeechDraft(null);
                }
              }}
            >
              Use this text
            </button>
          </section>
        )}
        {t.transcript && (
          <section className="chat-review">
            <label>
              Review the text from your image
              <textarea
                value={t.transcript.text}
                disabled={disabled}
                onChange={(e) => {
                  t.setTranscript({ ...t.transcript!, text: e.target.value });
                  t.setApproved(false);
                }}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                disabled={disabled}
                checked={t.approved}
                onChange={(e) => t.setApproved(e.target.checked)}
              />
              This text is correct
            </label>
          </section>
        )}
        {session && (
          <div className="chat-tools">
            <button onClick={() => setIllustrations(!illustrations)}>
              {illustrations ? "Hide illustrations" : "Use an illustration"}
            </button>
            <div className="composer-modes" aria-label="Message purpose">
              <button
                className={intent === "ask_question" ? "active" : ""}
                onClick={() => setIntent("ask_question")}
              >
                Ask
              </button>
              <button
                className={intent === "answer" ? "active" : ""}
                onClick={() => setIntent("answer")}
              >
                Answer
              </button>
            </div>
            {move?.content_status !== "unavailable" && (
              <>
                <button
                  disabled={disabled}
                  onClick={() => void t.send("example")}
                >
                  Show an example
                </button>
                <button
                  disabled={disabled}
                  onClick={() => void t.send("slow_down")}
                >
                  Break it down
                </button>
              </>
            )}
            <button disabled={disabled} onClick={() => void t.send("practice")}>
              Practice
            </button>
          </div>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {session && move?.answer_type === "boolean" && intent === "answer" ? (
            <select
              aria-label="Your answer"
              value={t.answer}
              disabled={disabled}
              onChange={(e) => t.setAnswer(e.target.value)}
            >
              <option value="">Choose True or False</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <textarea
              ref={textareaRef}
              aria-label={session ? "Message OVAEL-X" : "Start a conversation"}
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
                    : "Write your answer…"
                  : "Message OVAEL-X…"
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          )}
          <div className="composer-bottom">
            <div className="attachment-wrap">
              <button
                type="button"
                className="icon-button"
                aria-label="Add attachment"
                aria-expanded={attachments}
                disabled={disabled}
                onClick={() => setAttachments(!attachments)}
              >
                <Plus size={21} />
              </button>
              {attachments && (
                <div className="attachment-menu">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setAttachments(false);
                      materialInput.current?.click();
                    }}
                  >
                    <Paperclip size={16} />
                    <span>Upload saved files<small>Notes, books, images, audio, video · 50 MB each</small></span>
                  </button>
                  {session && (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          file.current?.click();
                        }}
                      >
                        <ScanText size={16} /> Answer from an image
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          audio.current?.click();
                        }}
                      >
                        <Mic size={16} /> Use a recorded answer
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setAttachments(false);
                          setDraw(true);
                        }}
                      >
                        <PenLine size={16} /> Draw an answer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <span>
              {session
                ? "Shift + Enter for a new line"
                : "Choose a course and topic to begin"}
            </span>
            <div className="composer-actions">
            <VoiceInput
              disabled={disabled}
              onAudio={t.transcribeAudio}
              onError={setError}
            />
            <button
              className="chat-send"
              aria-label="Send message"
              disabled={disabled || !questionReady}
            >
              <Send size={19} />
            </button>
            </div>
          </div>
        </form>
        <input
          ref={materialInput}
          type="file"
          className="sr-only"
          multiple
          aria-label="Upload saved learning files"
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
          onChange={(e) => {
            const image = e.target.files?.[0];
            if (image) void t.extract(image);
            e.target.value = "";
          }}
        />
        <input
          ref={audio}
          type="file"
          className="sr-only"
          accept=".wav,.mp3,.m4a,.webm"
          onChange={(e) => {
            const recording = e.target.files?.[0];
            if (recording) void t.transcribeAudio(recording);
            e.target.value = "";
          }}
        />
      </div>
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
