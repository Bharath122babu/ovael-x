import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export function VoiceInput({
  disabled,
  onAudio,
  onError,
}: {
  disabled: boolean;
  onAudio: (file: File) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number>();
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      window.clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  async function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (starting || disabled) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError(
        "Microphone recording is unavailable in this browser. Upload recorded audio instead.",
      );
      return;
    }
    setStarting(true);
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled.current) {
        audio.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = audio;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (value) => MediaRecorder.isTypeSupported(value),
      );
      const current = new MediaRecorder(
        audio,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = current;
      const chunks: BlobPart[] = [];
      let total = 0;
      current.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          total += event.data.size;
          if (total > 25 * 1024 * 1024 && current.state === "recording")
            current.stop();
        }
      };
      current.onstop = () => {
        window.clearTimeout(timer.current);
        audio.getTracks().forEach((track) => track.stop());
        if (cancelled.current) return;
        setRecording(false);
        if (total > 25 * 1024 * 1024) {
          onError("Recording is too large. Keep your answer shorter.");
          return;
        }
        const type = current.mimeType || "audio/webm";
        void onAudio(
          new File(
            chunks,
            `recorded-answer.${type.includes("mp4") ? "m4a" : "webm"}`,
            { type },
          ),
        );
      };
      current.onerror = () => {
        audio.getTracks().forEach((track) => track.stop());
        setRecording(false);
        onError("Recording failed. Upload audio or type instead.");
      };
      current.start(1000);
      setRecording(true);
      timer.current = window.setTimeout(() => {
        if (current.state === "recording") current.stop();
      }, 300000);
    } catch {
      onError(
        "Microphone access was not available. Check browser permission or upload audio.",
      );
    } finally {
      setStarting(false);
    }
  }
  return (
    <button
      type="button"
      className={`voice-input ${recording ? "recording" : ""}`}
      disabled={!recording && (disabled || starting)}
      onClick={() => void record()}
      aria-label={recording ? "Stop recording" : "Speech to text"}
      title={
        recording
          ? "Stop and review transcript"
          : "Speech to text: record, then review your words"
      }
    >
      {recording ? <Square size={18} /> : <Mic size={18} />}{" "}
      {recording ? "Stop" : null}
    </button>
  );
}
