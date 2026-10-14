import { useEffect, useId, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { checkedMermaid } from "../../diagrams";
export function MermaidDiagram({
  source,
  title = "Learning diagram",
}: {
  source: string;
  title?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ""),
    staging = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");
    async function render() {
      try {
        const text = checkedMermaid(source);
        const { default: mermaid } = await import("mermaid");
        if (cancelled || !staging.current) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          htmlLabels: false,
          fontFamily: "Arial, sans-serif",
          maxTextSize: 12000,
          maxEdges: 100,
          flowchart: { htmlLabels: false },
        });
        const result = await mermaid.render(
          `ovaelDiagram${id}`,
          text,
          staging.current,
        );
        if (!cancelled)
          setSvg(
            DOMPurify.sanitize(result.svg, {
              USE_PROFILES: { svg: true, svgFilters: true },
              FORBID_TAGS: ["foreignObject", "a", "image", "script"],
              FORBID_ATTR: ["href", "xlink:href"],
            }),
          );
      } catch {
        if (!cancelled)
          setError(
            "This diagram could not be rendered. Its source is available below.",
          );
      } finally {
        if (!cancelled) staging.current?.replaceChildren();
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [source, id]);
  return (
    <figure className="mermaid-figure">
      <figcaption>{title}</figcaption>
      <div ref={staging} className="mermaid-staging" aria-hidden="true" />
      {error ? (
        <p role="status">{error}</p>
      ) : svg ? (
        <div
          className="mermaid-output"
          role="img"
          aria-label={title}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p role="status">Rendering diagram…</p>
      )}
      <details>
        <summary>Diagram source</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  );
}
