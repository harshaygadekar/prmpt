import { redactSecretPatterns } from "@prmpt/shared-utils";

// --- Context types ---

export type ContextSourceType = "file" | "selection" | "git-diff";

export interface ContextSource {
  type: ContextSourceType;
  label: string;
  content: string;
  /** Byte length of the raw content (before truncation) */
  originalLength: number;
  truncated: boolean;
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  /** Relative file path (if applicable) */
  filePath?: string | undefined;
  /** Language identifier */
  languageId?: string | undefined;
  /** Line range (1-based) */
  startLine?: number | undefined;
  endLine?: number | undefined;
  /** Git ref for diff context */
  gitRef?: string | undefined;
}

export interface ContextInjectionResult {
  sources: ContextSource[];
  /** Combined context string ready for injection into prompt */
  combinedContext: string;
  /** Total character count */
  totalLength: number;
  /** Whether any source was truncated */
  hasTruncation: boolean;
}

// --- Configuration ---

export interface ContextLimits {
  /** Max characters per single source (default: 10000) */
  maxSourceChars: number;
  /** Max total combined characters (default: 30000) */
  maxTotalChars: number;
  /** Max lines for git diff (default: 500) */
  maxDiffLines: number;
}

const DEFAULT_LIMITS: ContextLimits = {
  maxSourceChars: 10_000,
  maxTotalChars: 30_000,
  maxDiffLines: 500
};

// --- Context collectors (VS Code abstractions) ---

/**
 * Abstraction over VS Code editor API for testability.
 * In production, these are backed by `vscode.window.activeTextEditor` etc.
 */
export interface EditorContext {
  /** Full content of the active file, or undefined if none open */
  getActiveFileContent(): string | undefined;
  /** Active file path (workspace-relative), or undefined */
  getActiveFilePath(): string | undefined;
  /** Language ID of the active file */
  getActiveLanguageId(): string | undefined;
  /** Total line count of active file */
  getActiveLineCount(): number | undefined;
  /** Selected text in the active editor, or undefined if no selection */
  getSelection(): string | undefined;
  /** Selection range [startLine, endLine] (1-based) or undefined */
  getSelectionRange(): [number, number] | undefined;
}

export interface GitContext {
  /** Returns staged + unstaged diff text, or undefined if git unavailable */
  getDiff(): string | undefined;
  /** Current branch name or HEAD ref */
  getRef(): string | undefined;
  /** Whether git is available in the workspace */
  isAvailable(): boolean;
}

// --- Context collection ---

export function collectFileContext(
  editor: EditorContext,
  limits: ContextLimits = DEFAULT_LIMITS
): ContextSource | undefined {
  const content = editor.getActiveFileContent();
  if (content === undefined || content.length === 0) return undefined;

  const filePath = editor.getActiveFilePath();
  const languageId = editor.getActiveLanguageId();
  const lineCount = editor.getActiveLineCount();

  const truncated = content.length > limits.maxSourceChars;
  const finalContent = truncated
    ? content.slice(0, limits.maxSourceChars) + "\n... [truncated]"
    : content;

  return {
    type: "file",
    label: filePath ?? "Active file",
    content: finalContent,
    originalLength: content.length,
    truncated,
    metadata: {
      filePath: filePath ?? undefined,
      languageId: languageId ?? undefined,
      startLine: 1,
      endLine: lineCount ?? undefined
    }
  };
}

export function collectSelectionContext(
  editor: EditorContext,
  limits: ContextLimits = DEFAULT_LIMITS
): ContextSource | undefined {
  const selection = editor.getSelection();
  if (selection === undefined || selection.length === 0) return undefined;

  const filePath = editor.getActiveFilePath();
  const languageId = editor.getActiveLanguageId();
  const range = editor.getSelectionRange();

  const truncated = selection.length > limits.maxSourceChars;
  const finalContent = truncated
    ? selection.slice(0, limits.maxSourceChars) + "\n... [truncated]"
    : selection;

  return {
    type: "selection",
    label: filePath ? `Selection in ${filePath}` : "Editor selection",
    content: finalContent,
    originalLength: selection.length,
    truncated,
    metadata: {
      filePath: filePath ?? undefined,
      languageId: languageId ?? undefined,
      startLine: range?.[0],
      endLine: range?.[1]
    }
  };
}

export function collectGitDiffContext(
  git: GitContext,
  limits: ContextLimits = DEFAULT_LIMITS
): ContextSource | undefined {
  if (!git.isAvailable()) return undefined;

  const diff = git.getDiff();
  if (diff === undefined || diff.length === 0) return undefined;

  const lines = diff.split("\n");
  const truncatedByLines = lines.length > limits.maxDiffLines;
  const truncatedContent = truncatedByLines
    ? lines.slice(0, limits.maxDiffLines).join("\n") + "\n... [diff truncated]"
    : diff;

  const truncated = truncatedByLines || truncatedContent.length > limits.maxSourceChars;
  const finalContent = truncatedContent.length > limits.maxSourceChars
    ? truncatedContent.slice(0, limits.maxSourceChars) + "\n... [truncated]"
    : truncatedContent;

  return {
    type: "git-diff",
    label: "Git diff",
    content: finalContent,
    originalLength: diff.length,
    truncated,
    metadata: {
      gitRef: git.getRef() ?? undefined
    }
  };
}

// --- Privacy redaction ---

export function redactContext(source: ContextSource): ContextSource {
  return {
    ...source,
    content: redactSecretPatterns(source.content)
  };
}

// --- Context injection ---

export interface ContextInjectionOptions {
  sources: ContextSourceType[];
  editor: EditorContext;
  git: GitContext;
  limits?: ContextLimits;
  /** If true, redact secret patterns before injection */
  redactSecrets?: boolean;
}

export function injectContext(options: ContextInjectionOptions): ContextInjectionResult {
  const limits = options.limits ?? DEFAULT_LIMITS;
  const collectors: Array<() => ContextSource | undefined> = [];

  for (const src of options.sources) {
    switch (src) {
      case "file":
        collectors.push(() => collectFileContext(options.editor, limits));
        break;
      case "selection":
        collectors.push(() => collectSelectionContext(options.editor, limits));
        break;
      case "git-diff":
        collectors.push(() => collectGitDiffContext(options.git, limits));
        break;
    }
  }

  let sources: ContextSource[] = [];
  for (const collect of collectors) {
    const source = collect();
    if (source) {
      sources.push(options.redactSecrets ? redactContext(source) : source);
    }
  }

  // Enforce total char limit
  let totalLength = 0;
  const finalSources: ContextSource[] = [];
  for (const source of sources) {
    if (totalLength + source.content.length > limits.maxTotalChars) {
      const remaining = limits.maxTotalChars - totalLength;
      if (remaining > 100) {
        finalSources.push({
          ...source,
          content: source.content.slice(0, remaining) + "\n... [total limit reached]",
          truncated: true
        });
      }
      break;
    }
    finalSources.push(source);
    totalLength += source.content.length;
  }

  const combinedParts: string[] = [];
  for (const source of finalSources) {
    const header = `--- ${source.type}: ${source.label} ---`;
    combinedParts.push(header);
    combinedParts.push(source.content);
  }

  const combinedContext = combinedParts.join("\n");

  return {
    sources: finalSources,
    combinedContext,
    totalLength: combinedContext.length,
    hasTruncation: finalSources.some((s) => s.truncated)
  };
}
