import { useEffect, useRef, useState } from "react";
import { useOvael } from "../../../context/OvaelContext";
import { useTeaching } from "../../../context/TeachingContext";
import { api } from "../../../api";
import { ovaelApi } from "../../../api/client";
import type { LearnerScreen, LearningLaunch } from "../../../types";
import { DrawingPad } from "../../content/DrawingPad";
import { LearnHeader } from "./learn/LearnHeader";
import { MessageList } from "./learn/MessageList";
import { Composer } from "./learn/Composer";
import type { Concept } from "./learn/types";

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
  const [intent, setIntent] = useState<"answer" | "ask_question">("ask_question");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uploadLock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [illustrations, setIllustrations] = useState(false);
  const tail = useRef<HTMLDivElement>(null);

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
    const targetSubjectId = subjectId || course?.subject_id || courses[0]?.subject_id;
    const targetConceptId = conceptId || concepts[0]?.concept_id || map.nodes[0]?.id;
    if (!targetSubjectId || !targetConceptId) {
      setError("Choose a course and topic first.");
      return;
    }
    await t.start({
      subject_id: targetSubjectId,
      concept_id: targetConceptId,
      course_id: course?.course_id || courses[0]?.course_id,
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

  return (
    <div className="chat-workspace">
      {/* Workspace Header & Recovery Banners */}
      <LearnHeader
        courseName={course?.name}
        title={
          session
            ? map.nodes.find((n) => n.id === session.concept_id)?.label ||
              session.goal?.replace(/^Understand /, "") ||
              "Conversation"
            : "New Learning Session"
        }
        hasSession={Boolean(session)}
        disabled={disabled}
        notice={t.notice}
        pending={t.pending}
        busy={t.busy}
        onNewChat={() => void t.finish()}
        onRecover={() => void t.recover()}
      />

      {/* Main Chat Scroll Container */}
      <MessageList
        session={session}
        entries={t.entries}
        user={user}
        profile={profile}
        courses={courses}
        mapNodes={map.nodes}
        sessionsCount={sessions.length}
        loading={loading}
        courseId={courseId}
        conceptId={conceptId}
        concepts={concepts}
        topicsLoading={topicsLoading}
        disabled={disabled}
        label={label}
        illustrations={illustrations}
        evaluation={evaluation}
        move={move}
        choice={t.choice}
        busy={t.busy}
        tailRef={tail}
        copiedId={copiedId}
        onCourseChange={(id) => {
          setCourseId(id);
          setConceptId("");
        }}
        onConceptChange={(id) => setConceptId(id)}
        onStart={(mode) => void start(mode)}
        onNavigate={onNavigate}
        onCopyMessage={handleCopyMessage}
        onSelectChoice={(idx) => {
          t.setChoice(idx);
          setIntent("answer");
        }}
      />

      {/* Input & Composer Region */}
      <Composer
        session={session}
        move={move}
        answer={session ? t.answer : goal}
        goal={goal}
        intent={intent}
        disabled={disabled}
        busy={t.busy}
        uploadNotice={uploadNotice}
        speechDraft={t.speechDraft}
        transcript={t.transcript}
        approved={t.approved}
        illustrations={illustrations}
        questionReady={questionReady}
        onAnswerChange={(val) => (session ? t.setAnswer(val) : setGoal(val))}
        onGoalChange={(val) => setGoal(val)}
        onIntentChange={(nextIntent) => setIntent(nextIntent)}
        onSetSpeechDraft={(draft) => t.setSpeechDraft(draft)}
        onApproveSpeech={() => {
          if (session) t.approveSpeech();
          else {
            setGoal(t.speechDraft?.trim() || "");
            t.setSpeechDraft(null);
          }
        }}
        onSetTranscriptText={(text) => {
          t.setTranscript({ ...t.transcript!, text });
          t.setApproved(false);
        }}
        onSetApproved={(isApproved) => t.setApproved(isApproved)}
        onSendSocratic={(action) => void t.send(action)}
        onToggleIllustrations={() => setIllustrations(!illustrations)}
        onSubmit={() => void submit()}
        onOpenDraw={() => setDraw(true)}
        onExtractImage={(img) => void t.extract(img)}
        onTranscribeAudio={(rec) => t.transcribeAudio(rec)}
        onUploadMaterials={(files) => void uploadMaterials(files)}
        onNavigate={onNavigate}
        onError={setError}
      />

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
