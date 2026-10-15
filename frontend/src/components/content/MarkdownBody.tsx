import { useState, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { parseLearningVisual } from "../../learningVisuals";
import { MermaidDiagram } from "./MermaidDiagram";

function CodeBlockWithCopy({
  language,
  children,
  className,
}: {
  language: string;
  children: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, "");
  const lineCount = codeText.split("\n").length;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = codeText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silently if clipboard is unavailable
    }
  };

  const isTerminal =
    language === "terminal" || language === "bash" || language === "shell" || language === "sh";

  return (
    <section className={`teaching-terminal ${isTerminal ? "is-terminal" : "is-code"}`}>
      <header className="code-block-header">
        <div className="code-meta">
          <span className="code-lang-badge">
            {isTerminal ? "Terminal" : language.toUpperCase()}
          </span>
          {lineCount > 1 && (
            <span className="code-line-count">{lineCount} lines</span>
          )}
        </div>
        <button
          type="button"
          className={`code-copy-button ${copied ? "copied" : ""}`}
          aria-label={copied ? "Code copied to clipboard" : "Copy code"}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </header>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </section>
  );
}

export function MarkdownBody({
  markdown,
  mathPlugins,
}: {
  markdown: string;
  mathPlugins?: {
    remark: NonNullable<
      ComponentProps<typeof ReactMarkdown>["remarkPlugins"]
    >;
    rehype: NonNullable<
      ComponentProps<typeof ReactMarkdown>["rehypePlugins"]
    >;
  };
}) {
  return (
    <div className="rich-text">
      <ReactMarkdown
        remarkPlugins={mathPlugins?.remark || [remarkGfm]}
        rehypePlugins={mathPlugins?.rehype}
        components={{
          // ReactMarkdown escapes HTML; generated markup is never executed.
          img: () => <span>[Image omitted from teaching text]</span>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const kind = match ? match[1] : undefined;

            if (kind === "steps" || kind === "chart") {
              try {
                const rows = parseLearningVisual(kind, String(children));
                if (kind === "steps")
                  return (
                    <ol className="teaching-steps">
                      {(rows as Array<{ title: string; text: string }>).map(
                        (item, index) => (
                          <li key={index}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.text}</p>
                            </div>
                          </li>
                        ),
                      )}
                    </ol>
                  );
                const bars = rows as Array<{ label: string; value: number }>;
                const largest = Math.max(
                  1,
                  ...bars.map((item) => Math.abs(item.value)),
                );
                return (
                  <figure className="teaching-chart">
                    <figcaption>Comparison</figcaption>
                    {bars.map((item, index) => (
                      <div key={index}>
                        <span>{item.label}</span>
                        <div className="chart-track">
                          <i
                            style={{
                              width: `${(Math.abs(item.value) / largest) * 100}%`,
                            }}
                          />
                        </div>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </figure>
                );
              } catch {
                return (
                  <pre className="visual-fallback">{String(children)}</pre>
                );
              }
            }

            if (kind === "mermaid") {
              return (
                <MermaidDiagram source={String(children).replace(/\n$/, "")} />
              );
            }

            if (kind) {
              return (
                <CodeBlockWithCopy language={kind} className={className}>
                  {children}
                </CodeBlockWithCopy>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <div className="code-block">{children}</div>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
