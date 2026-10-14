import { lazy, Suspense } from "react";
import { MarkdownBody } from "./MarkdownBody";
const MathRichText = lazy(() => import("./MathRichText"));
export function RichText({ markdown }: { markdown: string }) {
  return /\$[^$]+\$/.test(markdown) ? (
    <Suspense fallback={<p role="status">Formatting the explanation…</p>}>
      <MathRichText markdown={markdown} />
    </Suspense>
  ) : (
    <MarkdownBody markdown={markdown} />
  );
}
