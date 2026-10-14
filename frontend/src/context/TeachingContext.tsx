import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { makeAnswerTurn, type Transcription } from "../assessment";
import { latestProjection } from "../localProjection";
import { TurnBuffer } from "../turnBuffer";
import type { TeachingSession } from "../types";
import { useOvael } from "./OvaelContext";
type Intent =
  | "answer"
  | "ask_question"
  | "need_explanation"
  | "example"
  | "repeat"
  | "practice"
  | "skip"
  | "slow_down";
type Entry = { id: string; who: "ovael" | "learner"; text: string };
function useController() {
  const {
    user,
    saveStateDelta,
    refresh,
    setError,
    localState,
    memory,
    sessions,
  } = useOvael();
  const uid = user?.user_id,
    owner = useRef(uid),
    revision = useRef(0),
    gate = useRef(false),
    buffer = useRef(new TurnBuffer());
  const [session, setSession] = useState<TeachingSession | null>(null),
    [entries, setEntries] = useState<Entry[]>([]);
  const [answer, setAnswer] = useState(""),
    [choice, setChoice] = useState<number | null>(null),
    [transcript, setTranscript] = useState<Transcription | null>(null),
    [approved, setApproved] = useState(false);
  const [speechDraft, setSpeechDraft] = useState<string | null>(null),
    [fromSpeech, setFromSpeech] = useState(false);
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState("");
  const key = uid ? `ovael.session.${uid}` : "";
  useEffect(() => {
    if (owner.current !== uid) return;
    setSession((current) => {
      const saved = sessions.find(
        (item) => item.teaching_session_id === current?.teaching_session_id,
      );
      return current && saved && current.turn_count !== saved.turn_count
        ? { ...current, turn_count: saved.turn_count }
        : current;
    });
  }, [sessions, uid]);
  const clearAnswer = () => {
    setAnswer("");
    setChoice(null);
    setTranscript(null);
    setApproved(false);
    setSpeechDraft(null);
    setFromSpeech(false);
  };
  const accept = (result: TeachingSession, base?: TeachingSession | null) => {
    const next = { ...base, ...result } as TeachingSession;
    setSession(next);
    saveStateDelta(next.state_delta);
    if (next.status === "active" && key)
      sessionStorage.setItem(key, next.teaching_session_id);
    if (next.move?.content)
      setEntries((old) => [
        ...old.filter((entry) => entry.id !== next.move!.move_id),
        {
          id: next.move!.move_id || crypto.randomUUID(),
          who: "ovael",
          text: next.move!.content,
        },
      ]);
    clearAnswer();
    setPending(false);
  };
  useEffect(() => {
    if (uid && !memory) return;
    owner.current = uid;
    const token = ++revision.current;
    gate.current = false;
    buffer.current.clear();
    setSession(null);
    setEntries([]);
    clearAnswer();
    setPending(false);
    setBusy(false);
    setNotice("");
    if (!uid) return;
    const saved =
      sessionStorage.getItem(`ovael.session.${uid}`) ||
      sessionStorage.getItem("ovael_session_id");
    if (!saved) return;
    gate.current = true;
    setBusy(true);
    void (async () => {
      try {
        let state: TeachingSession = await api(
          `/v1/learning/sessions/${saved}`,
        );
        if (token !== revision.current) return;
        if (state.status !== "active") {
          sessionStorage.removeItem(`ovael.session.${uid}`);
          sessionStorage.removeItem("ovael_session_id");
          return;
        }
        setSession(state);
        if (state.pending_turn) {
          const recovered: TeachingSession = await api(
            `/v1/learning/sessions/${saved}/resume`,
            "POST",
            undefined,
            state.pending_turn_key,
          );
          if (token !== revision.current) return;
          state = { ...state, ...recovered };
          setNotice(
            "Your saved response was recovered. Continue from the current teaching move.",
          );
        }
        accept(state);
        sessionStorage.removeItem("ovael_session_id");
      } catch (e) {
        if (token === revision.current) {
          if ((e as { status?: number }).status === 404) {
            sessionStorage.removeItem(`ovael.session.${uid}`);
            sessionStorage.removeItem("ovael_session_id");
            setNotice(
              "The previous lesson is no longer available. Start a new lesson.",
            );
          } else {
            setError(
              e instanceof Error ? e.message : "Could not recover the lesson.",
            );
            setPending(true);
          }
        }
      } finally {
        if (token === revision.current) {
          gate.current = false;
          setBusy(false);
        }
      }
    })();
    return () => {
      revision.current++;
    };
  }, [uid, memory?.memory_mode]);
  async function guarded(work: (valid: () => boolean) => Promise<void>) {
    if (!uid || gate.current) return;
    const token = revision.current;
    gate.current = true;
    setBusy(true);
    setError("");
    const valid = () => token === revision.current && owner.current === uid;
    try {
      await work(valid);
    } catch (e) {
      if (valid())
        setError(e instanceof Error ? e.message : "The request failed.");
    } finally {
      if (valid()) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  async function start(
    payload: {
      subject_id: string;
      concept_id: string;
      course_id?: string;
      mode: "study" | "practice" | "review";
      goal: string;
    },
    replaceCurrent = false,
  ) {
    await guarded(async (valid) => {
      if (pending || buffer.current.pending)
        throw new Error("Retry your pending message before switching topics.");
      if (session?.status === "active") {
        if (!replaceCurrent)
          throw new Error("Start a new chat before switching topics.");
        const completed: TeachingSession = await api(
          `/v1/learning/sessions/${session.teaching_session_id}/complete`,
          "POST",
        );
        if (!valid()) return;
        saveStateDelta(completed.state_delta);
        setSession(null);
        setEntries([]);
        clearAnswer();
        if (key) sessionStorage.removeItem(key);
      }
      const result: TeachingSession = await api(
        "/v1/learning/sessions",
        "POST",
        {
          ...payload,
          source_client: "web",
          context_capsule: memory?.personalization_enabled
            ? {
                local_state_deltas: latestProjection(
                  localState,
                  payload.subject_id,
                ),
              }
            : {},
        },
      );
      if (!valid()) return;
      setEntries([
        { id: crypto.randomUUID(), who: "learner", text: payload.goal },
      ]);
      buffer.current.clear();
      accept({ ...payload, ...result });
      setNotice("");
    });
  }
  async function send(intent: Intent = "answer") {
    if (!session || gate.current) return;
    await guarded(async (valid) => {
      const payload =
        buffer.current.pending?.payload ||
        (intent === "answer"
          ? makeAnswerTurn({
              kind: session.move?.answer_type || "free_text",
              answer,
              choice,
              codeMode: session.move?.answer_type === "code",
              transcript,
              transcriptApproved: approved,
              fromSpeech,
              requiredModalities: session.move?.required_modalities || [],
            })
          : {
              response: answer.trim(),
              learner_intent: intent,
              input_mode: "text",
            });
      if (!buffer.current.pending)
        setEntries((old) => [
          ...old,
          {
            id: crypto.randomUUID(),
            who: "learner",
            text:
              answer.trim() ||
              transcript?.text ||
              (intent === "answer" && choice !== null
                ? `Option ${choice + 1}`
                : intent.replaceAll("_", " ")),
          },
        ]);
      const attempt = buffer.current.begin(payload);
      try {
        const result: TeachingSession = await api(
          `/v1/learning/sessions/${session.teaching_session_id}/turns`,
          "POST",
          attempt.payload,
          attempt.key,
        );
        if (!valid()) return;
        buffer.current.acknowledge(attempt.key);
        accept(result, session);
        await refresh();
      } catch (e) {
        if (!valid()) return;
        if ([400, 422].includes((e as { status?: number }).status || 0)) {
          const state: TeachingSession | null = await api(
            `/v1/learning/sessions/${session.teaching_session_id}`,
          ).catch(() => null);
          if (!valid()) return;
          if (state && !state.pending_turn) {
            buffer.current.clear();
            setPending(false);
          } else setPending(true);
        } else setPending(true);
        throw e;
      }
    });
  }
  async function openHandoff(token: string) {
    let opened = false;
    await guarded(async (valid) => {
      if (pending || buffer.current.pending)
        throw new Error(
          "Retry your pending message before opening another conversation.",
        );
      const state: TeachingSession = await api(
        `/v1/mcp/handoff/${encodeURIComponent(token)}`,
        "POST",
      );
      if (!valid()) return;
      opened = true;
      setEntries([]);
      if (state.status !== "active") {
        setSession(null);
        clearAnswer();
        if (key) sessionStorage.removeItem(key);
        setNotice(
          "This conversation has finished. Start a new chat to continue learning.",
        );
        return;
      }
      accept(state);
      if (state.pending_turn) {
        setPending(true);
        const resumed: TeachingSession = await api(
          `/v1/learning/sessions/${state.teaching_session_id}/resume`,
          "POST",
          undefined,
          state.pending_turn_key,
        );
        if (!valid()) return;
        accept(resumed, state);
      }
      setNotice("Conversation opened.");
    });
    return opened;
  }
  async function recover() {
    if (buffer.current.pending) {
      await send();
      return;
    }
    await guarded(async (valid) => {
      const saved =
        session?.teaching_session_id ||
        (key && sessionStorage.getItem(key)) ||
        sessionStorage.getItem("ovael_session_id");
      if (!saved) throw new Error("No saved lesson is available.");
      const state: TeachingSession = await api(
        `/v1/learning/sessions/${saved}`,
      );
      if (!valid()) return;
      const result = state.pending_turn
        ? await api(
            `/v1/learning/sessions/${saved}/resume`,
            "POST",
            undefined,
            state.pending_turn_key,
          )
        : state;
      if (!valid()) return;
      accept(result, state);
      setNotice("Lesson recovered.");
    });
  }
  async function finish() {
    await guarded(async (valid) => {
      if (pending || buffer.current.pending)
        throw new Error(
          "Recover the saved response before finishing this lesson.",
        );
      if (session) {
        const result: TeachingSession = await api(
          `/v1/learning/sessions/${session.teaching_session_id}/complete`,
          "POST",
        );
        if (!valid()) return;
        saveStateDelta(result.state_delta);
      }
      setSession(null);
      setEntries([]);
      clearAnswer();
      buffer.current.clear();
      if (key) sessionStorage.removeItem(key);
      setNotice("Lesson completed and added to history.");
      await refresh();
    });
  }
  async function extract(file: File) {
    await guarded(async (valid) => {
      if (!file.type.startsWith("image/"))
        throw new Error("Choose an image for answer transcription.");
      const form = new FormData();
      form.append("file", file);
      const result = await api("/v1/learning/extract-image", "POST", form);
      if (!valid()) return;
      setTranscript({
        text: result.text || "",
        extraction_confidence: result.extraction_confidence,
        engine: result.engine,
        source: file.name === "drawing.png" ? "drawing" : "image",
      });
      setApproved(false);
      if (!result.text)
        throw new Error(
          "No readable text was found. Type your answer or choose a clearer image.",
        );
    });
  }
  async function transcribeAudio(file: File) {
    await guarded(async (valid) => {
      if (file.size > 25 * 1024 * 1024)
        throw new Error("Audio must be smaller than 25 MB.");
      const form = new FormData();
      form.append("audio", file);
      const result = await api("/v1/learning/transcribe-audio", "POST", form);
      if (!valid()) return;
      if (!result.text?.trim())
        throw new Error("No readable speech was found.");
      setSpeechDraft(result.text);
    });
  }
  function approveSpeech() {
    if (speechDraft?.trim()) {
      setAnswer(speechDraft.trim());
      setFromSpeech(true);
      setSpeechDraft(null);
    }
  }
  function clearAfterDeletion() {
    revision.current++;
    gate.current = false;
    buffer.current.clear();
    setSession(null);
    setEntries([]);
    clearAnswer();
    setPending(false);
    setBusy(false);
    if (key) sessionStorage.removeItem(key);
  }
  return {
    speechDraft,
    setSpeechDraft,
    transcribeAudio,
    approveSpeech,
    clearAfterDeletion,
    session,
    entries,
    answer,
    setAnswer,
    choice,
    setChoice,
    transcript,
    setTranscript,
    approved,
    setApproved,
    busy,
    pending,
    notice,
    start,
    send,
    recover,
    openHandoff,
    finish,
    extract,
  };
}
type Value = ReturnType<typeof useController>;
const Context = createContext<Value | null>(null);
export function TeachingProvider({ children }: { children: React.ReactNode }) {
  const value = useController();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTeaching() {
  const value = useContext(Context);
  if (!value) throw new Error("Teaching provider missing");
  return value;
}
