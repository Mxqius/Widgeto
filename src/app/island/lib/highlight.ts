/**
 * A small syntax highlighter for code in Ask answers. Not a parser: one
 * regex pass per language family that finds comments, strings, numbers and
 * words, then sorts the words into keywords, literals, types and calls. That
 * is right for nearly everything a short answer contains, and costs a few
 * kilobytes instead of a highlighting library.
 *
 * It returns plain tokens; the caller turns them into elements, so nothing in
 * an answer can ever be injected as markup.
 */

export type TokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "literal"
  | "type"
  | "fn"
  | "prop"
  | "tag"
  | "attr"
  | "punct";

export interface Token {
  k: TokenKind;
  v: string;
}

interface Family {
  /** comment patterns, as regex sources */
  comments: string[];
  /** string patterns, as regex sources */
  strings: string[];
  keywords: Set<string>;
  literals: Set<string>;
  /** a capitalised word is a type (C-like languages) */
  types?: boolean;
  /** a word or string followed by `:` is a property (JSON, YAML, CSS) */
  props?: boolean;
  /** `$name` is a variable (shell, PHP, PowerShell) */
  vars?: boolean;
  /** `--flag` and `-f` are options (shell) */
  flags?: boolean;
  /** keywords match regardless of case (SQL, PowerShell) */
  caseless?: boolean;
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const DQ = String.raw`"(?:[^"\\\n]|\\.)*"?`;
const SQ = String.raw`'(?:[^'\\\n]|\\.)*'?`;
const BQ = String.raw`\x60(?:[^\x60\\]|\\.)*\x60?`;
const LINE = (start: string) => String.raw`${start}[^\n]*`;
const BLOCK = String.raw`\/\*[\s\S]*?(?:\*\/|$)`;

const C_LITERALS = words("true false null undefined NaN Infinity this self super nil None True False");

const FAMILIES: Record<string, Family> = {
  js: {
    comments: [LINE("//"), BLOCK],
    strings: [BQ, DQ, SQ],
    keywords: words(
      "abstract as async await break case catch class const continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let namespace new of private protected public readonly return satisfies set static switch throw try type typeof var void while with yield",
    ),
    literals: C_LITERALS,
    types: true,
  },
  py: {
    comments: [LINE("#")],
    strings: [String.raw`[rbfuRBFU]{0,2}"""[\s\S]*?(?:"""|$)`, String.raw`[rbfuRBFU]{0,2}'''[\s\S]*?(?:'''|$)`, String.raw`[rbfuRBFU]{0,2}` + DQ, String.raw`[rbfuRBFU]{0,2}` + SQ],
    keywords: words(
      "and as assert async await break class continue def del elif else except finally for from global if import in is lambda match case nonlocal not or pass raise return try while with yield print",
    ),
    literals: words("True False None self cls"),
    types: true,
  },
  rust: {
    comments: [LINE("//"), BLOCK],
    strings: [String.raw`r#*"[\s\S]*?"#*`, DQ, String.raw`'(?:[^'\\\n]|\\.)'`],
    keywords: words(
      "as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return static struct trait type unsafe use where while macro_rules",
    ),
    literals: words("true false self Self None Some Ok Err"),
    types: true,
  },
  go: {
    comments: [LINE("//"), BLOCK],
    strings: [BQ, DQ, String.raw`'(?:[^'\\\n]|\\.)*'`],
    keywords: words(
      "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
    ),
    literals: words("true false nil iota"),
    types: true,
  },
  c: {
    comments: [LINE("//"), BLOCK, LINE("#")],
    strings: [String.raw`@?\$?` + DQ, SQ],
    keywords: words(
      "abstract async await auto base bool break byte case catch char checked class const continue decimal default delegate do double dynamic else enum event explicit extern final finally fixed float for foreach fun goto if implements implicit import in inline int interface internal is lock long namespace new object operator out override package params private protected public readonly record ref return sbyte sealed short signed sizeof static string struct switch synchronized template throw throws try typedef typeof typename uint ulong unsigned using val var virtual void volatile when while with yield let func guard extension protocol",
    ),
    literals: C_LITERALS,
    types: true,
  },
  shell: {
    comments: [LINE("#")],
    strings: [DQ, SQ],
    keywords: words(
      "if then else elif fi for while until do done case esac in function return local export source alias echo cd sudo set unset exit read printf test",
    ),
    literals: words("true false"),
    vars: true,
    flags: true,
  },
  ps: {
    comments: [String.raw`<#[\s\S]*?(?:#>|$)`, LINE("#")],
    strings: [DQ, SQ],
    keywords: words(
      "begin break catch class continue data do dynamicparam else elseif end exit filter finally for foreach from function if in param process return switch throw trap try until using while",
    ),
    literals: words("$true $false $null"),
    vars: true,
    flags: true,
    caseless: true,
  },
  sql: {
    comments: [LINE("--"), BLOCK],
    strings: [SQ, DQ],
    keywords: words(
      "select from where and or not insert into values update set delete create table view index drop alter add column primary key foreign references join inner left right outer full on as group by order having limit offset distinct union all case when then else end is in like between exists default unique check constraint returning with asc desc count sum avg min max",
    ),
    literals: words("null true false"),
    caseless: true,
  },
  json: {
    comments: [LINE("//")],
    strings: [DQ],
    keywords: words(""),
    literals: words("true false null"),
    props: true,
  },
  yaml: {
    comments: [LINE("#")],
    strings: [DQ, SQ],
    keywords: words(""),
    literals: words("true false null yes no on off ~"),
    props: true,
  },
  css: {
    comments: [BLOCK],
    strings: [DQ, SQ],
    keywords: words("important media supports keyframes import from to and not only"),
    literals: words("inherit initial unset none auto transparent currentColor"),
    props: true,
  },
  lua: {
    comments: [String.raw`--\[\[[\s\S]*?(?:\]\]|$)`, LINE("--")],
    strings: [DQ, SQ],
    keywords: words("and break do else elseif end for function goto if in local not or repeat return then until while"),
    literals: words("true false nil self"),
  },
};

const ALIASES: Record<string, string> = {
  js: "js", jsx: "js", mjs: "js", cjs: "js", javascript: "js", ts: "js", tsx: "js", typescript: "js",
  py: "py", python: "py", python3: "py",
  rs: "rust", rust: "rust",
  go: "go", golang: "go",
  c: "c", h: "c", cpp: "c", "c++": "c", cc: "c", hpp: "c", cs: "c", csharp: "c", "c#": "c", java: "c",
  kotlin: "c", kt: "c", swift: "c", php: "c", dart: "c", scala: "c", objc: "c",
  sh: "shell", bash: "shell", zsh: "shell", shell: "shell", console: "shell", fish: "shell",
  ps: "ps", ps1: "ps", powershell: "ps", pwsh: "ps",
  sql: "sql", mysql: "sql", postgres: "sql", postgresql: "sql", sqlite: "sql",
  json: "json", jsonc: "json", json5: "json",
  yaml: "yaml", yml: "yaml", toml: "yaml", ini: "yaml", env: "yaml",
  css: "css", scss: "css", sass: "css", less: "css",
  lua: "lua",
  html: "markup", xml: "markup", svg: "markup", vue: "markup", svelte: "markup", xaml: "markup",
};

/** The display name for a fence's language tag. */
export function languageLabel(lang: string): string {
  const l = lang.toLowerCase();
  const names: Record<string, string> = {
    js: "JavaScript", jsx: "JSX", ts: "TypeScript", tsx: "TSX", javascript: "JavaScript", typescript: "TypeScript",
    py: "Python", python: "Python", rs: "Rust", rust: "Rust", go: "Go", cs: "C#", csharp: "C#", cpp: "C++",
    "c++": "C++", c: "C", java: "Java", kotlin: "Kotlin", kt: "Kotlin", swift: "Swift", php: "PHP",
    sh: "Shell", bash: "Bash", zsh: "Zsh", shell: "Shell", ps1: "PowerShell", powershell: "PowerShell",
    pwsh: "PowerShell", sql: "SQL", json: "JSON", yaml: "YAML", yml: "YAML", toml: "TOML", css: "CSS",
    scss: "SCSS", html: "HTML", xml: "XML", lua: "Lua", dart: "Dart",
  };
  return names[l] ?? lang;
}

/** Split code into coloured tokens; an unknown language guesses from its look. */
export function highlight(code: string, lang: string): Token[] {
  const id = ALIASES[lang.toLowerCase()] ?? guess(code);
  if (id === "markup") return markup(code);
  const fam = id ? FAMILIES[id] : undefined;
  return fam ? scan(code, fam) : [{ k: "plain", v: code }];
}

/** No tag on the fence: a quick look at the code picks a family, or none. */
function guess(code: string): string | undefined {
  const head = code.slice(0, 400);
  if (/^\s*</.test(head) && /<\/?[a-z][\w-]*[\s>]/i.test(head)) return "markup";
  if (/^\s*[{[]/.test(head) && /"\s*:/.test(head)) return "json";
  if (/^\s*(def |import |from \w+ import|class \w+.*:\s*$)/m.test(head)) return "py";
  if (/^\s*(fn |let mut |use \w+::|impl )/m.test(head)) return "rust";
  if (/^\s*(SELECT|INSERT|UPDATE|CREATE|WITH)\b/i.test(head)) return "sql";
  if (/^\s*(\$ |npm |npx |git |cd |sudo |curl |pip |cargo |winget )/m.test(head)) return "shell";
  if (/[;{}]\s*$/m.test(head) || /\b(const|function|return|=>)\b/.test(head)) return "js";
  return undefined;
}

const NUMBER = String.raw`\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[a-zA-Z%]{1,3})?\b|#[\da-fA-F]{3,8}\b`;

const compiled = new WeakMap<Family, RegExp>();

function regexFor(f: Family): RegExp {
  let re = compiled.get(f);
  if (!re) {
    const word = f.vars ? String.raw`\$?[A-Za-z_][\w$-]*|\$\{[^}\n]*\}?` : String.raw`[A-Za-z_$][\w$]*`;
    const flag = f.flags ? String.raw`|(?<flag>(?<=\s)--?[A-Za-z][\w-]*)` : "";
    re = new RegExp(
      `(?<comment>${f.comments.join("|")})|(?<string>${f.strings.join("|")})|(?<number>${NUMBER})${flag}|(?<word>${word})`,
      "g",
    );
    compiled.set(f, re);
  }
  re.lastIndex = 0;
  return re;
}

function scan(code: string, f: Family): Token[] {
  const out: Token[] = [];
  const push = (k: TokenKind, v: string) => {
    if (!v) return;
    const last = out[out.length - 1];
    if (last && last.k === k) last.v += v;
    else out.push({ k, v });
  };
  const re = regexFor(f);
  let at = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    push("plain", code.slice(at, m.index));
    at = m.index + m[0].length;
    const g = m.groups!;
    const next = code.slice(at).match(/^\s*(.)/)?.[1];
    if (g.comment) push("comment", m[0]);
    else if (g.string) push(f.props && next === ":" ? "prop" : "string", m[0]);
    else if (g.number) push("number", m[0]);
    else if (g.flag) push("attr", m[0]);
    else push(classify(m[0], f, next), m[0]);
  }
  push("plain", code.slice(at));
  return out;
}

function classify(w: string, f: Family, next: string | undefined): TokenKind {
  const key = f.caseless ? w.toLowerCase() : w;
  if (f.literals.has(key) || f.literals.has(w)) return "literal";
  if (f.vars && w.startsWith("$")) return "prop";
  if (f.keywords.has(key)) return "keyword";
  if (f.props && next === ":") return "prop";
  if (next === "(") return "fn";
  if (f.types && /^[A-Z][a-z0-9]/.test(w)) return "type";
  return "plain";
}

/** HTML and XML: tags, attribute names, their values and comments. */
function markup(code: string): Token[] {
  const out: Token[] = [];
  const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?)([\w:-]+)|([\w:-]+)(?==)|("[^"]*"?|'[^']*'?)|(\/?>)/g;
  let at = 0;
  let inTag = false;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > at) out.push({ k: "plain", v: code.slice(at, m.index) });
    at = m.index + m[0].length;
    if (m[1]) out.push({ k: "comment", v: m[1] });
    else if (m[2]) {
      out.push({ k: "punct", v: m[2] }, { k: "tag", v: m[3] });
      inTag = true;
    } else if (m[4] && inTag) out.push({ k: "attr", v: m[4] });
    else if (m[5] && inTag) out.push({ k: "string", v: m[5] });
    else if (m[6]) {
      out.push({ k: "punct", v: m[6] });
      inTag = false;
    } else out.push({ k: "plain", v: m[0] });
  }
  if (at < code.length) out.push({ k: "plain", v: code.slice(at) });
  return out;
}
