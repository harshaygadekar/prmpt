import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthError,
  ModelNotAvailableError,
  NetworkError,
  TimeoutError,
  ValidationError,
  createAnthropicAdapter,
  createGeminiAdapter,
  createOpenRouterAdapter,
  createGroqAdapter,
  createOllamaAdapter,
  ProviderError,
  createNoopAdapter,
  createOpenAIAdapter,
  normalizeProviderError,
  PROVIDER_CAPABILITY_MATRIX,
  preflightValidate,
  getProviderCapabilities
} from "../dist/index.js";

test("noop adapter satisfies baseline provider contract", async () => {
  const adapter = createNoopAdapter("openai");

  const health = await adapter.healthCheck();
  assert.equal(health.ok, true);
  assert.ok(health.correlationId);

  const optimize = await adapter.optimize({
    prompt: "Refactor this code safely.",
    modelFamily: "gpt",
    outputFormat: "markdown"
  });

  assert.equal(optimize.optimizedPrompt, "Refactor this code safely.");
  assert.equal(optimize.usage.inputTokens > 0, true);
  assert.equal(typeof optimize.correlationId, "string");

  const estimate = await adapter.estimateTokens({
    prompt: "Estimate tokens.",
    modelFamily: "gpt"
  });
  assert.equal(estimate.estimatedTokens > 0, true);
});

test("openai adapter maps non-stream request and response", async () => {
  const calls = [];
  const adapter = createOpenAIAdapter({
    apiKey: "test-openai-key",
    model: "gpt-4o-mini",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        choices: [{ message: { content: "Optimized by OpenAI." } }],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 9
        }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Rewrite this prompt for clarity.",
    modelFamily: "gpt",
    outputFormat: "json",
    temperature: 0.4,
    maxOutputTokens: 256,
    topP: 0.9,
    stopSequences: ["END"]
  });

  assert.equal(result.optimizedPrompt, "Optimized by OpenAI.");
  assert.equal(result.usage.inputTokens, 12);
  assert.equal(result.usage.outputTokens, 9);
  assert.equal(calls.length, 1);

  const call = calls[0];
  assert.equal(String(call.input), "https://api.openai.com/v1/chat/completions");
  const headers = toHeaderObject(call.init?.headers);
  assert.equal(headers.authorization, "Bearer test-openai-key");
  assert.equal(headers["content-type"], "application/json");

  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.stream, false);
  assert.equal(body.temperature, 0.4);
  assert.equal(body.max_tokens, 256);
  assert.equal(body.top_p, 0.9);
  assert.deepEqual(body.stop, ["END"]);
  assert.equal(body.response_format.type, "json_object");
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");
});

test("openai adapter supports streaming path", async () => {
  const adapter = createOpenAIAdapter({
    apiKey: "test-openai-key",
    model: "gpt-4o-mini",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"choices":[{"delta":{"content":"Hello "}}]}',
          'data: {"choices":[{"delta":{"content":"world"}}]}',
          "data: [DONE]"
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "hello",
    modelFamily: "gpt",
    outputFormat: "markdown",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Hello ");
  assert.equal(chunks[1].delta, "world");
  assert.equal(chunks[2].done, true);
});

test("anthropic adapter maps request and response", async () => {
  const calls = [];
  const adapter = createAnthropicAdapter({
    apiKey: "test-anthropic-key",
    model: "claude-sonnet-4-5",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        content: [{ type: "text", text: "Optimized by Anthropic." }],
        usage: {
          input_tokens: 14,
          output_tokens: 11
        }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Create a concise debugging prompt.",
    modelFamily: "claude",
    outputFormat: "json",
    maxOutputTokens: 200
  });

  assert.equal(result.optimizedPrompt, "Optimized by Anthropic.");
  assert.equal(result.usage.inputTokens, 14);
  assert.equal(result.usage.outputTokens, 11);

  const call = calls[0];
  assert.equal(String(call.input), "https://api.anthropic.com/v1/messages");
  const headers = toHeaderObject(call.init?.headers);
  assert.equal(headers["x-api-key"], "test-anthropic-key");
  assert.equal(headers["anthropic-version"], "2023-06-01");

  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.model, "claude-sonnet-4-5");
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 200);
  assert.equal(body.messages[0].role, "user");
  assert.match(body.messages[0].content, /return only valid json/i);
});

test("anthropic adapter supports streaming path", async () => {
  const adapter = createAnthropicAdapter({
    apiKey: "test-anthropic-key",
    model: "claude-sonnet-4-5",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Part "}}',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"two"}}',
          'data: {"type":"message_stop"}'
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "stream",
    modelFamily: "claude",
    outputFormat: "markdown",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Part ");
  assert.equal(chunks[1].delta, "two");
  assert.equal(chunks[2].done, true);
});

test("gemini adapter maps request and response", async () => {
  const calls = [];
  const adapter = createGeminiAdapter({
    apiKey: "test-gemini-key",
    model: "gemini-2.0-flash",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: "Optimized by Gemini." }]
            }
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 8
        }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Generate JSON schema instructions.",
    modelFamily: "gemini",
    outputFormat: "json",
    temperature: 0.2,
    maxOutputTokens: 120
  });

  assert.equal(result.optimizedPrompt, "Optimized by Gemini.");
  assert.equal(result.usage.inputTokens, 10);
  assert.equal(result.usage.outputTokens, 8);

  const call = calls[0];
  assert.equal(
    String(call.input),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-gemini-key"
  );

  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.contents[0].parts[0].text, "Generate JSON schema instructions.");
  assert.equal(body.generationConfig.temperature, 0.2);
  assert.equal(body.generationConfig.maxOutputTokens, 120);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
});

test("gemini adapter supports streaming path", async () => {
  const adapter = createGeminiAdapter({
    apiKey: "test-gemini-key",
    model: "gemini-2.0-flash",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"candidates":[{"content":{"parts":[{"text":"Chunk 1 "}]}}]}',
          'data: {"candidates":[{"content":{"parts":[{"text":"Chunk 2"}]}}]}'
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "stream",
    modelFamily: "gemini",
    outputFormat: "markdown",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Chunk 1 ");
  assert.equal(chunks[1].delta, "Chunk 2");
  assert.equal(chunks[2].done, true);
});

test("adapter validation rejects wrong model family and invalid options", async () => {
  const openaiAdapter = createOpenAIAdapter({
    apiKey: "test-openai-key",
    model: "gpt-4o-mini",
    fetchFn: async () => jsonResponse({})
  });

  await assert.rejects(
    () =>
      openaiAdapter.optimize({
        prompt: "bad family",
        modelFamily: "claude",
        outputFormat: "markdown"
      }),
    (error) => error instanceof ValidationError
  );

  const anthropicAdapter = createAnthropicAdapter({
    apiKey: "test-anthropic-key",
    model: "claude-sonnet-4-5",
    fetchFn: async () => jsonResponse({})
  });

  await assert.rejects(
    () =>
      anthropicAdapter.optimize({
        prompt: "bad temp",
        modelFamily: "claude",
        outputFormat: "markdown",
        temperature: 1.5
      }),
    (error) => error instanceof ValidationError
  );
});

test("openai adapter maps 404 to model not available error", async () => {
  const adapter = createOpenAIAdapter({
    apiKey: "test-openai-key",
    model: "missing-model",
    fetchFn: async () => jsonResponse({ error: "model not found" }, { status: 404 })
  });

  await assert.rejects(
    () =>
      adapter.optimize({
        prompt: "hello",
        modelFamily: "gpt",
        outputFormat: "markdown"
      }),
    (error) => error instanceof ModelNotAvailableError
  );
});

test("openai healthCheck returns non-throwing failure payload", async () => {
  const adapter = createOpenAIAdapter({
    apiKey: "bad-key",
    model: "gpt-4o-mini",
    fetchFn: async () => jsonResponse({ error: "unauthorized" }, { status: 401 })
  });

  const result = await adapter.healthCheck();
  assert.equal(result.ok, false);
  assert.ok(result.correlationId);
});

test("normalizeProviderError preserves known provider errors", () => {
  const original = new AuthError("anthropic", "bad key");
  const normalized = normalizeProviderError(original, "anthropic");

  assert.equal(normalized, original);
  assert.equal(normalized.code, "auth_error");
});

test("normalizeProviderError maps timeout and network errors", () => {
  const timeout = normalizeProviderError(new DOMException("aborted", "AbortError"), "openai");
  assert.equal(timeout instanceof TimeoutError, true);

  const network = normalizeProviderError(new Error("fetch failed"), "gemini");
  assert.equal(network instanceof NetworkError, true);
});

test("normalizeProviderError wraps unknown failures", () => {
  const normalized = normalizeProviderError(new Error("boom"), "gemini");
  assert.equal(normalized instanceof ProviderError, true);
  assert.equal(normalized.code, "unknown_error");
  assert.match(normalized.message, /boom/i);
});

function jsonResponse(payload, options = {}) {
  const { status = 200, headers = {} } = options;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

function sseResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/event-stream"
    }
  });
}

function toHeaderObject(headers) {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const out = {};
    for (const [key, value] of headers.entries()) {
      out[key.toLowerCase()] = value;
    }
    return out;
  }
  if (Array.isArray(headers)) {
    const out = {};
    for (const [key, value] of headers) {
      out[String(key).toLowerCase()] = String(value);
    }
    return out;
  }
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = String(value);
  }
  return out;
}

// --- OpenRouter adapter tests (ST-04-03) ---

test("openrouter adapter maps request with site headers", async () => {
  const calls = [];
  const adapter = createOpenRouterAdapter({
    apiKey: "test-or-key",
    model: "anthropic/claude-3.5-sonnet",
    siteUrl: "https://prmpt.dev",
    siteName: "prmpt",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        choices: [{ message: { content: "Optimized by OpenRouter." } }],
        usage: { prompt_tokens: 10, completion_tokens: 6 }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Optimize this prompt via OpenRouter.",
    modelFamily: "claude",
    outputFormat: "markdown"
  });

  assert.equal(result.optimizedPrompt, "Optimized by OpenRouter.");
  assert.equal(calls.length, 1);

  const call = calls[0];
  assert.equal(String(call.input), "https://openrouter.ai/api/v1/chat/completions");
  const headers = toHeaderObject(call.init?.headers);
  assert.equal(headers.authorization, "Bearer test-or-key");
  assert.equal(headers["http-referer"], "https://prmpt.dev");
  assert.equal(headers["x-title"], "prmpt");
});

test("openrouter adapter accepts any model family", async () => {
  const adapter = createOpenRouterAdapter({
    apiKey: "test-or-key",
    model: "google/gemini-2.0-flash",
    fetchFn: async () =>
      jsonResponse({
        choices: [{ message: { content: "OK." } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 }
      })
  });

  const result = await adapter.optimize({
    prompt: "Test gemini via OpenRouter.",
    modelFamily: "gemini",
    outputFormat: "text"
  });

  assert.equal(result.optimizedPrompt, "OK.");
});

test("openrouter adapter supports streaming", async () => {
  const adapter = createOpenRouterAdapter({
    apiKey: "test-or-key",
    model: "openai/gpt-4o",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"choices":[{"delta":{"content":"Hi "}}]}',
          'data: {"choices":[{"delta":{"content":"there"}}]}',
          "data: [DONE]"
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "stream test",
    modelFamily: "gpt",
    outputFormat: "markdown",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Hi ");
  assert.equal(chunks[1].delta, "there");
  assert.equal(chunks[2].done, true);
});

// --- Groq adapter tests (ST-04-03) ---

test("groq adapter maps request without response_format", async () => {
  const calls = [];
  const adapter = createGroqAdapter({
    apiKey: "test-groq-key",
    model: "llama-3.3-70b-versatile",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        choices: [{ message: { content: "Optimized by Groq." } }],
        usage: { prompt_tokens: 8, completion_tokens: 4 }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Optimize via Groq.",
    modelFamily: "gpt",
    outputFormat: "json"
  });

  assert.equal(result.optimizedPrompt, "Optimized by Groq.");
  assert.equal(calls.length, 1);

  const call = calls[0];
  assert.equal(String(call.input), "https://api.groq.com/openai/v1/chat/completions");
  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.response_format, undefined, "Groq should not send response_format");
  assert.equal(body.model, "llama-3.3-70b-versatile");
});

test("groq adapter supports streaming", async () => {
  const adapter = createGroqAdapter({
    apiKey: "test-groq-key",
    model: "llama-3.3-70b-versatile",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"choices":[{"delta":{"content":"Fast "}}]}',
          'data: {"choices":[{"delta":{"content":"inference"}}]}',
          "data: [DONE]"
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "stream me",
    modelFamily: "gpt",
    outputFormat: "markdown",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Fast ");
  assert.equal(chunks[2].done, true);
});

// --- Ollama adapter tests (ST-04-04) ---

test("ollama adapter maps request without auth headers", async () => {
  const calls = [];
  const adapter = createOllamaAdapter({
    model: "llama3.2",
    fetchFn: async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        choices: [{ message: { content: "Optimized locally." } }],
        usage: { prompt_tokens: 6, completion_tokens: 3 }
      });
    }
  });

  const result = await adapter.optimize({
    prompt: "Optimize this locally.",
    modelFamily: "local",
    outputFormat: "markdown"
  });

  assert.equal(result.optimizedPrompt, "Optimized locally.");
  assert.equal(calls.length, 1);

  const call = calls[0];
  assert.equal(String(call.input), "http://localhost:11434/v1/chat/completions");
  const headers = toHeaderObject(call.init?.headers);
  assert.equal(headers.authorization, undefined, "Ollama should not send Authorization header");

  const body = JSON.parse(String(call.init?.body));
  assert.equal(body.response_format, undefined, "Ollama should not send response_format");
  assert.equal(body.model, "llama3.2");
});

test("ollama adapter rejects non-local model family", async () => {
  const adapter = createOllamaAdapter({
    model: "llama3.2",
    fetchFn: async () => jsonResponse({})
  });

  await assert.rejects(
    () =>
      adapter.optimize({
        prompt: "wrong family",
        modelFamily: "gpt",
        outputFormat: "markdown"
      }),
    (error) => error instanceof ValidationError
  );
});

test("ollama adapter health check uses /api/tags endpoint", async () => {
  const calls = [];
  const adapter = createOllamaAdapter({
    model: "llama3.2",
    fetchFn: async (input) => {
      calls.push(String(input));
      return jsonResponse({ models: [{ name: "llama3.2" }] });
    }
  });

  const health = await adapter.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], "http://localhost:11434/api/tags");
});

test("ollama adapter supports streaming", async () => {
  const adapter = createOllamaAdapter({
    model: "llama3.2",
    fetchFn: async () =>
      sseResponse(
        [
          'data: {"choices":[{"delta":{"content":"Local "}}]}',
          'data: {"choices":[{"delta":{"content":"model"}}]}',
          "data: [DONE]"
        ].join("\n\n")
      )
  });

  const chunks = [];
  for await (const chunk of adapter.streamOptimize({
    prompt: "stream local",
    modelFamily: "local",
    outputFormat: "text",
    stream: true
  })) {
    chunks.push(chunk);
  }

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].delta, "Local ");
  assert.equal(chunks[2].done, true);
});

test("ollama adapter supports custom base URL", async () => {
  const calls = [];
  const adapter = createOllamaAdapter({
    model: "phi3",
    baseUrl: "http://192.168.1.100:11434",
    fetchFn: async (input) => {
      calls.push(String(input));
      return jsonResponse({
        choices: [{ message: { content: "OK." } }],
        usage: { prompt_tokens: 3, completion_tokens: 1 }
      });
    }
  });

  await adapter.optimize({
    prompt: "test custom base",
    modelFamily: "local",
    outputFormat: "text"
  });

  assert.equal(calls[0], "http://192.168.1.100:11434/v1/chat/completions");
});

// --- Capability matrix tests (ST-04-05) ---

test("PROVIDER_CAPABILITY_MATRIX covers all six providers", () => {
  const providers = ["openai", "anthropic", "gemini", "openrouter", "groq", "ollama"];
  for (const provider of providers) {
    const caps = PROVIDER_CAPABILITY_MATRIX[provider];
    assert.ok(caps, `Missing capabilities for ${provider}`);
    assert.equal(typeof caps.streaming, "boolean");
    assert.equal(typeof caps.structuredOutput, "boolean");
    assert.equal(typeof caps.reasoning, "boolean");
    assert.equal(typeof caps.routing, "boolean");
  }
});

test("getProviderCapabilities returns correct caps", () => {
  const caps = getProviderCapabilities("openrouter");
  assert.equal(caps.routing, true);
  assert.equal(caps.streaming, true);
});

test("preflightValidate adjusts json format for non-structured providers", () => {
  const result = preflightValidate(
    { prompt: "test", modelFamily: "local", outputFormat: "json", stream: false },
    PROVIDER_CAPABILITY_MATRIX.ollama
  );

  assert.equal(result.valid, true);
  assert.equal(result.adjustedRequest.outputFormat, "markdown");
  assert.ok(result.warnings.some((w) => /json/i.test(w)));
});

test("preflightValidate passes through valid request unchanged", () => {
  const request = { prompt: "test", modelFamily: "gpt", outputFormat: "json", stream: true };
  const result = preflightValidate(request, PROVIDER_CAPABILITY_MATRIX.openai);

  assert.equal(result.valid, true);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.adjustedRequest.outputFormat, "json");
  assert.equal(result.adjustedRequest.stream, true);
});

test("openrouter has routing capability, others do not", () => {
  assert.equal(PROVIDER_CAPABILITY_MATRIX.openrouter.routing, true);
  assert.equal(PROVIDER_CAPABILITY_MATRIX.openai.routing, false);
  assert.equal(PROVIDER_CAPABILITY_MATRIX.groq.routing, false);
});

test("groq and ollama lack structured output and reasoning", () => {
  assert.equal(PROVIDER_CAPABILITY_MATRIX.groq.structuredOutput, false);
  assert.equal(PROVIDER_CAPABILITY_MATRIX.groq.reasoning, false);
  assert.equal(PROVIDER_CAPABILITY_MATRIX.ollama.structuredOutput, false);
  assert.equal(PROVIDER_CAPABILITY_MATRIX.ollama.reasoning, false);
});
