import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  collectFileContext,
  collectSelectionContext,
  collectGitDiffContext,
  redactContext,
  injectContext
} from "../dist/context/index.js";

// --- Mock factories ---

function createMockEditor(overrides = {}) {
  return {
    getActiveFileContent: () => "const x = 1;\nconst y = 2;\nreturn x + y;",
    getActiveFilePath: () => "src/utils/math.ts",
    getActiveLanguageId: () => "typescript",
    getActiveLineCount: () => 3,
    getSelection: () => undefined,
    getSelectionRange: () => undefined,
    ...overrides
  };
}

function createMockGit(overrides = {}) {
  return {
    getDiff: () => "diff --git a/file.ts\n+ added line\n- removed line",
    getRef: () => "main",
    isAvailable: () => true,
    ...overrides
  };
}

// --- File context tests ---

describe("collectFileContext", () => {
  test("collects active file content", () => {
    const editor = createMockEditor();
    const result = collectFileContext(editor);

    assert.ok(result);
    assert.equal(result.type, "file");
    assert.equal(result.label, "src/utils/math.ts");
    assert.ok(result.content.includes("const x = 1"));
    assert.equal(result.truncated, false);
    assert.equal(result.metadata.filePath, "src/utils/math.ts");
    assert.equal(result.metadata.languageId, "typescript");
  });

  test("returns undefined when no file is open", () => {
    const editor = createMockEditor({ getActiveFileContent: () => undefined });
    const result = collectFileContext(editor);
    assert.equal(result, undefined);
  });

  test("truncates large files", () => {
    const bigContent = "x".repeat(15000);
    const editor = createMockEditor({ getActiveFileContent: () => bigContent });
    const result = collectFileContext(editor, { maxSourceChars: 10000, maxTotalChars: 30000, maxDiffLines: 500 });

    assert.ok(result);
    assert.equal(result.truncated, true);
    assert.ok(result.content.length <= 10020); // 10000 + "[truncated]" suffix
    assert.equal(result.originalLength, 15000);
  });
});

// --- Selection context tests ---

describe("collectSelectionContext", () => {
  test("collects editor selection", () => {
    const editor = createMockEditor({
      getSelection: () => "const y = 2;",
      getSelectionRange: () => [2, 2]
    });
    const result = collectSelectionContext(editor);

    assert.ok(result);
    assert.equal(result.type, "selection");
    assert.ok(result.label.includes("Selection"));
    assert.equal(result.content, "const y = 2;");
    assert.equal(result.metadata.startLine, 2);
    assert.equal(result.metadata.endLine, 2);
  });

  test("returns undefined when no selection", () => {
    const editor = createMockEditor();
    const result = collectSelectionContext(editor);
    assert.equal(result, undefined);
  });

  test("returns undefined for empty selection", () => {
    const editor = createMockEditor({ getSelection: () => "" });
    const result = collectSelectionContext(editor);
    assert.equal(result, undefined);
  });
});

// --- Git diff context tests ---

describe("collectGitDiffContext", () => {
  test("collects git diff", () => {
    const git = createMockGit();
    const result = collectGitDiffContext(git);

    assert.ok(result);
    assert.equal(result.type, "git-diff");
    assert.ok(result.content.includes("diff --git"));
    assert.equal(result.metadata.gitRef, "main");
    assert.equal(result.truncated, false);
  });

  test("returns undefined when git not available", () => {
    const git = createMockGit({ isAvailable: () => false });
    const result = collectGitDiffContext(git);
    assert.equal(result, undefined);
  });

  test("returns undefined for empty diff", () => {
    const git = createMockGit({ getDiff: () => "" });
    const result = collectGitDiffContext(git);
    assert.equal(result, undefined);
  });

  test("truncates long diffs by line count", () => {
    const longDiff = Array.from({ length: 600 }, (_, i) => `+line ${i}`).join("\n");
    const git = createMockGit({ getDiff: () => longDiff });
    const result = collectGitDiffContext(git, { maxSourceChars: 50000, maxTotalChars: 100000, maxDiffLines: 500 });

    assert.ok(result);
    assert.equal(result.truncated, true);
    assert.ok(result.content.includes("[diff truncated]"));
  });
});

// --- Privacy redaction tests ---

describe("redactContext", () => {
  test("redacts secret patterns from content", () => {
    const source = {
      type: "file",
      label: "test.env",
      content: "API_KEY=sk-abc123def456ghi789jklmnop\nNORMAL=hello",
      originalLength: 52,
      truncated: false,
      metadata: {}
    };
    const result = redactContext(source);

    assert.ok(!result.content.includes("sk-abc123def456ghi789jklmnop"));
    assert.ok(result.content.includes("NORMAL=hello"));
  });
});

// --- Context injection (combined) tests ---

describe("injectContext", () => {
  test("combines file and selection context", () => {
    const editor = createMockEditor({
      getSelection: () => "selected text",
      getSelectionRange: () => [1, 1]
    });
    const git = createMockGit({ isAvailable: () => false });

    const result = injectContext({
      sources: ["file", "selection"],
      editor,
      git
    });

    assert.equal(result.sources.length, 2);
    assert.ok(result.combinedContext.includes("--- file:"));
    assert.ok(result.combinedContext.includes("--- selection:"));
    assert.equal(result.hasTruncation, false);
  });

  test("includes git diff when available", () => {
    const editor = createMockEditor();
    const git = createMockGit();

    const result = injectContext({
      sources: ["file", "git-diff"],
      editor,
      git
    });

    assert.ok(result.sources.some((s) => s.type === "git-diff"));
    assert.ok(result.combinedContext.includes("diff --git"));
  });

  test("skips unavailable sources gracefully", () => {
    const editor = createMockEditor({ getActiveFileContent: () => undefined });
    const git = createMockGit({ isAvailable: () => false });

    const result = injectContext({
      sources: ["file", "selection", "git-diff"],
      editor,
      git
    });

    assert.equal(result.sources.length, 0);
    assert.equal(result.combinedContext, "");
  });

  test("enforces total character limit", () => {
    const bigContent = "x".repeat(25000);
    const editor = createMockEditor({
      getActiveFileContent: () => bigContent,
      getSelection: () => "y".repeat(25000),
      getSelectionRange: () => [1, 100]
    });
    const git = createMockGit({ isAvailable: () => false });

    const result = injectContext({
      sources: ["file", "selection"],
      editor,
      git,
      limits: { maxSourceChars: 50000, maxTotalChars: 30000, maxDiffLines: 500 }
    });

    assert.ok(result.totalLength <= 31000); // slight buffer for headers
    assert.equal(result.hasTruncation, true);
  });

  test("applies secret redaction when enabled", () => {
    const secretKey = "sk-abcdefghijklmnopqrstuvwxyz1234";
    const editor = createMockEditor({
      getActiveFileContent: () => "secret=" + secretKey
    });
    const git = createMockGit({ isAvailable: () => false });

    const result = injectContext({
      sources: ["file"],
      editor,
      git,
      redactSecrets: true
    });

    assert.ok(!result.combinedContext.includes(secretKey));
  });
});
