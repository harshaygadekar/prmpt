import assert from "node:assert/strict";
import test from "node:test";

import { createNoopAdapter } from "@prmpt/provider-adapters";
import { ProviderUnavailableError } from "@prmpt/provider-adapters";
import { optimizePrompt } from "../dist/index.js";

test("optimizePrompt uses provider adapter output", async () => {
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

  assert.equal(response.optimizedPrompt.includes("Explain this bug in simple terms."), true);
  assert.equal(response.score, 50);
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

  assert.equal(response.optimizedPrompt.startsWith("[xml]"), true);
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
