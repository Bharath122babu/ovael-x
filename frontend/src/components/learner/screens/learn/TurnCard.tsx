import { ArrowRight, Check, Copy } from "lucide-react";
import { RichText } from "../../../content/RichText";
import type { LearnerScreen } from "../../../../types";
import type { TeachingEntry } from "./types";

export interface TurnCardProps {
  entry: TeachingEntry;
  isCopied: boolean;
  onCopy: (id: string, text: string) => void;
  onNavigate?: (screen: LearnerScreen) => void;
}

export function TurnCard({
  entry,
  isCopied,
  onCopy,
  onNavigate,
}: TurnCardProps) {
  return (
    <article className={`chat-message ${entry.who}`}>
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
                aria-label={isCopied ? "Copied" : "Copy response"}
                onClick={() => onCopy(entry.id, entry.text)}
                title="Copy response to clipboard"
              >
                {isCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
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
  );
}
