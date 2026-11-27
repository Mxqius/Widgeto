import { Check, Copy } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { highlight, languageLabel } from "../lib/highlight";

/**
 * Just enough Markdown for short answers: paragraphs, bullet and numbered
 * lists, fenced code (highlighted), **bold**, *italic* and `code`. Built as
 * elements, never as HTML, so nothing in an answer can inject markup.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.trimStart().match(/^```\s*([\w#+.-]*)/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) code.push(lines[i++]);
      // still streaming when the closing fence has not arrived
      const open = i >= lines.length;
      i++;
      blocks.push(<CodeBlock key={blocks.length} code={code.join("\n")} lang={fence[1]} live={open} />);
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].match(re)![1]);
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={blocks.length}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i]) &&
      !lines[i].trimStart().startsWith("```")
    ) {
      para.push(lines[i++].replace(/^#{1,6}\s+/, ""));
    }
    blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
  }
  return <>{blocks}</>;
}

function inline(s: string): ReactNode {
  const parts = s.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`") && p.length > 1) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** A fenced block: its language, a copy button of its own, and the code in colour. */
function CodeBlock({ code, lang, live }: { code: string; lang: string; live: boolean }) {
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="island-code">
      <div className="island-code-head">
        <span>{lang ? languageLabel(lang) : "Code"}</span>
        {!live && (
          <button
            type="button"
            className="island-code-copy"
            title="Copy code"
            onClick={(e) => {
              e.stopPropagation();
              void navigator.clipboard?.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre>
        <code>
          {tokens.map((t, k) =>
            t.k === "plain" ? <Fragment key={k}>{t.v}</Fragment> : <span key={k} className={`tk-${t.k}`}>{t.v}</span>,
          )}
        </code>
      </pre>
    </div>
  );
}
