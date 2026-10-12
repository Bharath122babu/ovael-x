import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * A safe, zero-dependency, XSS-immune Markdown and math formatter for tutor explanations.
 * Parses code blocks, headers, bullet/ordered lists, blockquotes, inline formatting,
 * and mathematical expressions without dangerouslySetInnerHTML.
 */
export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className={`tutor-markdown ${className}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};

interface Block {
  type: 'paragraph' | 'header' | 'code' | 'list' | 'quote' | 'math_display';
  level?: number;
  language?: string;
  lines: string[];
  ordered?: boolean;
}

function parseBlocks(text: string): Block[] {
  const rawLines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++; // skip closing ```
      blocks.push({
        type: 'code',
        language: language || 'text',
        lines: codeLines,
      });
      continue;
    }

    // Display Math ($$ ... $$)
    if (line.trim().startsWith('$$')) {
      const mathLines: string[] = [];
      if (line.trim().endsWith('$$') && line.trim().length > 2) {
        mathLines.push(line.trim().slice(2, -2).trim());
        i++;
      } else {
        i++;
        while (i < rawLines.length && !rawLines[i].trim().endsWith('$$')) {
          mathLines.push(rawLines[i]);
          i++;
        }
        if (i < rawLines.length) i++; // skip closing $$
      }
      blocks.push({
        type: 'math_display',
        lines: mathLines,
      });
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const h3Match = line.match(/^###\s+(.*)/);
    if (h3Match) {
      blocks.push({ type: 'header', level: 3, lines: [h3Match[1]] });
      i++;
      continue;
    }
    const h2Match = line.match(/^##\s+(.*)/);
    if (h2Match) {
      blocks.push({ type: 'header', level: 2, lines: [h2Match[1]] });
      i++;
      continue;
    }
    const h1Match = line.match(/^#\s+(.*)/);
    if (h1Match) {
      blocks.push({ type: 'header', level: 1, lines: [h1Match[1]] });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }

    // Bullet List (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < rawLines.length && /^\s*[-*]\s+/.test(rawLines[i])) {
        listLines.push(rawLines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, lines: listLines });
      continue;
    }

    // Ordered List (1. 2.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < rawLines.length && /^\s*\d+\.\s+/.test(rawLines[i])) {
        listLines.push(rawLines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, lines: listLines });
      continue;
    }

    // Paragraph (accumulate lines until blank line or special block)
    const paraLines: string[] = [line];
    i++;
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('```') &&
      !rawLines[i].trim().startsWith('#') &&
      !rawLines[i].trim().startsWith('>') &&
      !/^\s*[-*]\s+/.test(rawLines[i]) &&
      !/^\s*\d+\.\s+/.test(rawLines[i])
    ) {
      paraLines.push(rawLines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case 'code':
      return <CodeBlock key={key} language={block.language || 'code'} code={block.lines.join('\n')} />;

    case 'math_display':
      return (
        <div key={key} className="tutor-math-display" role="math">
          <code>{block.lines.join('\n')}</code>
        </div>
      );

    case 'header': {
      const text = block.lines[0];
      if (block.level === 1) return <h3 key={key} className="tutor-heading tutor-heading--1">{renderInline(text)}</h3>;
      if (block.level === 2) return <h4 key={key} className="tutor-heading tutor-heading--2">{renderInline(text)}</h4>;
      return <h5 key={key} className="tutor-heading tutor-heading--3">{renderInline(text)}</h5>;
    }

    case 'quote':
      return (
        <blockquote key={key} className="tutor-quote">
          {block.lines.map((line, idx) => (
            <p key={idx}>{renderInline(line)}</p>
          ))}
        </blockquote>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag key={key} className={`tutor-list ${block.ordered ? 'tutor-list--ordered' : 'tutor-list--unordered'}`}>
          {block.lines.map((item, idx) => (
            <li key={idx} className="tutor-list-item">{renderInline(item)}</li>
          ))}
        </ListTag>
      );
    }

    case 'paragraph':
    default:
      return (
        <p key={key} className="tutor-paragraph">
          {block.lines.map((line, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {renderInline(line)}
            </React.Fragment>
          ))}
        </p>
      );
  }
}

/**
 * Render inline tokens: bold, italic, inline code, and inline math
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting on code (`...`), bold (**...**), math ($...$), and italic (*...*)
  const tokens = text.split(/(`[^`]+`|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code key={index} className="tutor-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }

    if (token.startsWith('$') && token.endsWith('$') && token.length >= 2) {
      return (
        <span key={index} className="tutor-inline-math" role="math">
          {token.slice(1, -1)}
        </span>
      );
    }

    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={index} className="tutor-strong">
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={index} className="tutor-em">
          {token.slice(1, -1)}
        </em>
      );
    }

    return token;
  });
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="tutor-code-block">
      <div className="tutor-code-block__header">
        <span className="tutor-code-block__lang">
          <Code2 size={13} aria-hidden="true" />
          {language}
        </span>
        <button
          type="button"
          className="tutor-code-block__copy"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="tutor-code-block__pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};
