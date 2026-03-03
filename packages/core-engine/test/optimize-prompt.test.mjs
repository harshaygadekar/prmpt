import assert from "node:assert/strict";
import test from "node:test";

import { createNoopAdapter } from "@prmpt/provider-adapters";
import { ProviderUnavailableError } from "@prmpt/provider-adapters";
import {
  optimizePrompt,
  runPipeline,
  createNormalizePass,
  createAnalyzePass,
  createEnrichPass,
  createOptimizePass,
  createRenderPass,
  createScorePass,
  getRenderer,
  listRendererFormats,
  scorePrompt
} from "../dist/index.js";
import { getRulePack } from "@prmpt/model-rules";

// --- Legacy API tests ---

test("optimizePrompt uses provider adapter output and returns metadata", async () => {
  const response = await optimizePrompt(
    {
      prompt: "  Explain this bug in simple terms.  ",
      modelFamily: "gpt",
      outputFormat: "markdown"
    },
    {
      adapter: createNoopAdapter("openai")
    }
  );

  assert.ok(response.optimizedPrompt.includes("Explain this bug in simple terms."));
  assert.ok(response.score >= 0 && response.score <= 100);
  assert.ok(response.metadata);
  assert.equal(response.metadata.provider, "openai");
  assert.equal(response.metadata.modelFamily, "gpt");
  assert.equal(response.metadata.outputFormat, "markdown");
  assert.equal(response.metadata.contentType, "text/markdown");
  assert.ok(response.metadata.passCount >= 1);
  assert.ok(response.metadata.rulePackVersion);
});

test("optimizePrompt returns scoreDetails with dimensions", async () => {
  const response = await optimizePrompt(
    {
      prompt: "You are an expert. Task: Explain this concept. Output format: markdown. Constraint: be concise.",
      modelFamily: "gpt",
      outputFormat: "markdown"
    },
    { adapter: createNoopAdapter("openai") }
  );

  assert.ok(response.scoreDetails);
  assert.ok(response.scoreDetails.total >= 0);
  assert.equal(response.scoreDetails.dimensions.length, 5);
  assert.ok(["poor", "fair", "good", "very_good", "excellent"].includes(response.scoreDetails.label));
});

test("optimizePrompt falls back to model preferred format", async () => {
  const response = await optimizePrompt(
    {
      prompt: "Do a JSON summary",
      modelFamily: "claude",
      outputFormat: "json"
    },
    {
      adapter: createNoopAdapter("anthropic")
    }
  );

  // Claude prefers XML — the rendered output should be XML
  assert.ok(response.metadata);
  assert.equal(response.metadata.contentType, "application/xml");
});

test("optimizePrompt normalizes provider errors", async () => {
  const failingAdapter = {
    providerId: "gemini",
    capabilities: {
      streaming: true,
      structuredOutput: true,
      reasoning: false,
      penalties: true,
      routing: false,
      tokenEstimation: false
    },
    async healthCheck() {
      return { ok: true, correlationId: "corr_test" };
    },
    async optimize() {
      throw new ProviderUnavailableError("gemini", "service down");
    }
  };

  await assert.rejects(
    () =>
      optimizePrompt(
        {
          prompt: "hello",
          modelFamily: "gemini",
          outputFormat: "markdown"
        },
        { adapter: failingAdapter }
      ),
    /service down/i
  );
});

// --- Pipeline framework tests ---

test("runPipeline returns full context with metadata and scoreDetails", async () => {
  const ctx = await runPipeline(
    {
      prompt: "  Explain this concept clearly.  ",
      modelFamily: "gpt",
      outputFormat: "markdown"
    },
    { adapter: createNoopAdapter("openai") }
  );

  assert.equal(ctx.originalPrompt, "  Explain this concept clearly.  ");
  assert.equal(ctx.normalizedPrompt, "Explain this concept clearly.");
  assert.equal(ctx.modelFamily, "gpt");
  assert.ok(ctx.score >= 0 && ctx.score <= 100);
  assert.ok(ctx.scoreDetails);
  assert.equal(ctx.scoreDetails.dimensions.length, 5);
  assert.equal(ctx.metadata.providerUsed, "openai");
  assert.equal(ctx.metadata.modelFamily, "gpt");
  assert.equal(ctx.metadata.rulePackVersion, "1.0.0");
  assert.equal(ctx.metadata.passes.length, 6);
  assert.ok(ctx.metadata.totalDurationMs >= 0);
  assert.equal(ctx.metadata.contentType, "text/markdown");
});

test("runPipeline passes execute in expected order (score before render)", async () => {
  const ctx = await runPipeline(
    {
      prompt: "Test ordering",
      modelFamily: "claude",
      outputFormat: "xml"
    },
    { adapter: createNoopAdapter("anthropic") }
  );

  const passNames = ctx.metadata.passes.map((p) => p.pass);
  assert.deepEqual(passNames, ["normalize", "analyze", "enrich", "optimize", "score", "render"]);
});

test("runPipeline supports custom pass injection", async () => {
  const customPass = {
    name: "custom",
    async execute(ctx) {
      return { ...ctx, optimizedPrompt: "CUSTOM:" + ctx.normalizedPrompt, score: 99 };
    }
  };

  const ctx = await runPipeline(
    {
      prompt: "Custom pass test",
      modelFamily: "gpt",
      outputFormat: "markdown"
    },
    {
      adapter: createNoopAdapter("openai"),
      passes: [createNormalizePass(), customPass]
    }
  );

  assert.equal(ctx.optimizedPrompt, "CUSTOM:Custom pass test");
  assert.equal(ctx.score, 99);
  assert.equal(ctx.metadata.passes.length, 2);
});

test("runPipeline analyze pass warns about short prompts", async () => {
  const ctx = await runPipeline(
    {
      prompt: "Hi",
      modelFamily: "gpt",
      outputFormat: "markdown"
    },
    { adapter: createNoopAdapter("openai") }
  );

  assert.ok(ctx.warnings.some((w) => /very short/i.test(w)));
});

test("runPipeline analyze pass warns about unsupported format", async () => {
  const ctx = await runPipeline(
    {
      prompt: "Generate JSON output for Claude",
      modelFamily: "claude",
      outputFormat: "json"
    },
    { adapter: createNoopAdapter("anthropic") }
  );

  assert.ok(ctx.warnings.some((w) => /not optimal/i.test(w)));
});

// --- Renderer tests (ST-05-03) ---

test("XML renderer produces valid XML with escaping", () => {
  const renderer = getRenderer("xml");
  assert.equal(renderer.format, "xml");

  const result = renderer.render({
    optimizedPrompt: 'Test <prompt> with "quotes" & special\'s',
    modelFamily: "claude",
    outputFormat: "xml",
    score: 75,
    warnings: []
  });

  assert.equal(result.contentType, "application/xml");
  assert.ok(result.rendered.includes("<?xml"));
  assert.ok(result.rendered.includes("&lt;prompt&gt;"));
  assert.ok(result.rendered.includes("&amp;"));
  assert.ok(result.rendered.includes("&quot;"));
  assert.ok(result.rendered.includes("&apos;"));
  assert.ok(!result.rendered.includes("<warnings>"));
});

test("XML renderer includes warnings when present", () => {
  const renderer = getRenderer("xml");
  const result = renderer.render({
    optimizedPrompt: "Test prompt",
    modelFamily: "gpt",
    outputFormat: "xml",
    score: 50,
    warnings: ["Warning 1", "Warning <2>"]
  });

  assert.ok(result.rendered.includes("<warnings>"));
  assert.ok(result.rendered.includes("Warning 1"));
  assert.ok(result.rendered.includes("Warning &lt;2&gt;"));
});

test("JSON renderer produces parseable JSON", () => {
  const renderer = getRenderer("json");
  assert.equal(renderer.format, "json");

  const result = renderer.render({
    optimizedPrompt: "Test prompt",
    modelFamily: "gpt",
    outputFormat: "json",
    score: 80,
    warnings: []
  });

  assert.equal(result.contentType, "application/json");
  const parsed = JSON.parse(result.rendered);
  assert.equal(parsed.optimizedPrompt, "Test prompt");
  assert.equal(parsed.modelFamily, "gpt");
  assert.equal(parsed.score, 80);
  assert.equal(parsed.warnings, undefined); // no warnings = omitted
});

test("JSON renderer includes warnings array when present", () => {
  const renderer = getRenderer("json");
  const result = renderer.render({
    optimizedPrompt: "Test",
    modelFamily: "claude",
    outputFormat: "json",
    score: 50,
    warnings: ["Fix this"]
  });

  const parsed = JSON.parse(result.rendered);
  assert.deepEqual(parsed.warnings, ["Fix this"]);
});

test("Markdown renderer includes heading and metadata", () => {
  const renderer = getRenderer("markdown");
  assert.equal(renderer.format, "markdown");

  const result = renderer.render({
    optimizedPrompt: "My optimized prompt here",
    modelFamily: "gemini",
    outputFormat: "markdown",
    score: 65,
    warnings: []
  });

  assert.equal(result.contentType, "text/markdown");
  assert.ok(result.rendered.includes("# Optimized Prompt"));
  assert.ok(result.rendered.includes("**Model family:** gemini"));
  assert.ok(result.rendered.includes("**Score:** 65/100"));
  assert.ok(result.rendered.includes("My optimized prompt here"));
});

test("Markdown renderer includes warnings section", () => {
  const renderer = getRenderer("markdown");
  const result = renderer.render({
    optimizedPrompt: "Test",
    modelFamily: "gpt",
    outputFormat: "markdown",
    score: 40,
    warnings: ["Short prompt", "Format mismatch"]
  });

  assert.ok(result.rendered.includes("**Warnings:**"));
  assert.ok(result.rendered.includes("- Short prompt"));
  assert.ok(result.rendered.includes("- Format mismatch"));
});

test("Text renderer returns plain prompt only", () => {
  const renderer = getRenderer("text");
  assert.equal(renderer.format, "text");

  const result = renderer.render({
    optimizedPrompt: "Just the prompt text",
    modelFamily: "local",
    outputFormat: "text",
    score: 50,
    warnings: ["Warning ignored in text"]
  });

  assert.equal(result.contentType, "text/plain");
  assert.equal(result.rendered, "Just the prompt text");
});

test("listRendererFormats returns all four formats", () => {
  const formats = listRendererFormats();
  assert.deepEqual(formats.sort(), ["json", "markdown", "text", "xml"]);
});

// --- Scoring tests (ST-05-04) ---

test("scorePrompt returns total and 5 dimensions", () => {
  const result = scorePrompt({
    prompt: "You are an expert reviewer. Task: Review this code for bugs. Context: Production Node.js service. Constraints: Focus on security. Output format: markdown list.",
    modelFamily: "gpt",
    outputFormat: "markdown",
    rulePack: getRulePack("gpt")
  });

  assert.ok(result.total >= 0 && result.total <= 100);
  assert.equal(result.dimensions.length, 5);
  assert.ok(["poor", "fair", "good", "very_good", "excellent"].includes(result.label));
  assert.ok(Array.isArray(result.reasons));
});

test("scorePrompt gives higher score to well-structured prompts", () => {
  const good = scorePrompt({
    prompt: "You are an expert prompt engineer.\n\nGoal: Rewrite the following prompt.\n\nContext: Production API.\n\nConstraints:\n- Must not exceed 500 words\n- Avoid ambiguity\n\nOutput: Return result as structured markdown.\n\n1) Analyze the prompt\n2) Identify improvements\n3) Deliver optimized version",
    modelFamily: "gpt",
    outputFormat: "markdown",
    rulePack: getRulePack("gpt")
  });

  const poor = scorePrompt({
    prompt: "fix this maybe",
    modelFamily: "gpt",
    outputFormat: "markdown",
    rulePack: getRulePack("gpt")
  });

  assert.ok(good.total > poor.total, `Expected ${good.total} > ${poor.total}`);
});

test("scorePrompt is deterministic for same input", () => {
  const input = {
    prompt: "You are an expert. Goal: Analyze the code. Context: Testing framework. Constraint: Be precise. Output: JSON list.",
    modelFamily: "claude",
    outputFormat: "xml",
    rulePack: getRulePack("claude")
  };

  const result1 = scorePrompt(input);
  const result2 = scorePrompt(input);

  assert.equal(result1.total, result2.total);
  assert.deepEqual(result1.dimensions, result2.dimensions);
  assert.deepEqual(result1.reasons, result2.reasons);
});

test("scorePrompt detects missing constraints reason code", () => {
  const result = scorePrompt({
    prompt: "Explain the concept of closures in JavaScript.",
    modelFamily: "gpt",
    outputFormat: "text",
    rulePack: getRulePack("gpt")
  });

  assert.ok(result.reasons.includes("missing_constraints"));
});

test("scorePrompt model-fit rewards Claude XML usage", () => {
  const withXml = scorePrompt({
    prompt: "You are an expert.\n<task>Analyze this</task>\n<context>Production</context>\n<constraints>Be precise</constraints>\n<output>XML format</output>",
    modelFamily: "claude",
    outputFormat: "xml",
    rulePack: getRulePack("claude")
  });

  const withoutXml = scorePrompt({
    prompt: "You are an expert. Analyze this. Production. Be precise. XML format. Goal: Analyze. Constraint: none. Output: xml.",
    modelFamily: "claude",
    outputFormat: "xml",
    rulePack: getRulePack("claude")
  });

  const xmlModelFit = withXml.dimensions.find((d) => d.dimension === "modelFit");
  const noXmlModelFit = withoutXml.dimensions.find((d) => d.dimension === "modelFit");
  assert.ok(xmlModelFit && noXmlModelFit);
  assert.ok(xmlModelFit.score >= noXmlModelFit.score, `Expected ${xmlModelFit.score} >= ${noXmlModelFit.score}`);
});

test("scorePrompt score bands match rubric labels", () => {
  // Use controlled prompts to test band boundaries
  const result = scorePrompt({
    prompt: "x",
    modelFamily: "local",
    outputFormat: "text",
    rulePack: getRulePack("local")
  });

  // Minimal prompt should score low
  assert.ok(result.total < 60, `Expected score < 60 but got ${result.total}`);
});
