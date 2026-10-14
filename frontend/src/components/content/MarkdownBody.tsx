import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseLearningVisual } from "../../learningVisuals";
import { MermaidDiagram } from "./MermaidDiagram";
export function MarkdownBody({
  markdown,
  mathPlugins,
}: {
  markdown: string;
  mathPlugins?: {
    remark: NonNullable<
      React.ComponentProps<typeof ReactMarkdown>["remarkPlugins"]
    >;
    rehype: NonNullable<
      React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]
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
            const kind = className?.replace("language-", "");
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
            return className === "language-mermaid" ? (
              <MermaidDiagram source={String(children).replace(/\n$/, "")} />
            ) : kind ? (
              <section className="teaching-terminal">
                <header>
                  {kind === "terminal" || kind === "bash" || kind === "shell"
                    ? "Terminal example"
                    : `${kind} example`}
                  <small>Read-only example</small>
                </header>
                <pre>
                  <code className={className}>{children}</code>
                </pre>
              </section>
            ) : (
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
