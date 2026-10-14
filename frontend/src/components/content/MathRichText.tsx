import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { MarkdownBody } from "./MarkdownBody";
export default function MathRichText({ markdown }: { markdown: string }) {
  return (
    <MarkdownBody
      markdown={markdown}
      mathPlugins={{
        remark: [remarkGfm, remarkMath],
        rehype: [
          [rehypeKatex, { trust: false, strict: "warn", maxExpand: 1000 }],
        ],
      }}
    />
  );
}
