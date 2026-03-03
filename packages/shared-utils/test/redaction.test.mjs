import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyField,
  redactPayload,
  redactSecretPatterns,
  createSafeLogger,
  detectLeaks
} from "../dist/redaction.js";

describe("classifyField", () => {
  it("classifies api_key as secret", () => {
    assert.equal(classifyField("api_key"), "secret");
    assert.equal(classifyField("OPENAI_API_KEY"), "secret");
    assert.equal(classifyField("apiKey"), "secret");
  });

  it("classifies secret/password/token as secret", () => {
    assert.equal(classifyField("secret"), "secret");
    assert.equal(classifyField("password"), "secret");
    assert.equal(classifyField("authorization"), "secret");
    assert.equal(classifyField("bearer"), "secret");
  });

  it("classifies prompt/code/body as restricted", () => {
    assert.equal(classifyField("prompt"), "restricted");
    assert.equal(classifyField("code_snippet"), "restricted");
    assert.equal(classifyField("source_code"), "restricted");
    assert.equal(classifyField("file_content"), "restricted");
    assert.equal(classifyField("optimizedPrompt"), "restricted");
    assert.equal(classifyField("inputText"), "restricted");
  });

  it("classifies normal fields as public", () => {
    assert.equal(classifyField("modelFamily"), "public");
    assert.equal(classifyField("outputFormat"), "public");
    assert.equal(classifyField("userId"), "public");
  });
});

describe("redactSecretPatterns", () => {
  it("redacts OpenAI key pattern", () => {
    const result = redactSecretPatterns("my key is sk-abcdefg1234567890abcdefg");
    assert.ok(!result.includes("sk-abcdefg"));
    assert.ok(result.includes("[REDACTED_SECRET]"));
  });

  it("redacts Anthropic key pattern", () => {
    const result = redactSecretPatterns("key-xyzxyxzyzxyxzyzxyxzyz123456");
    assert.ok(result.includes("[REDACTED_SECRET]"));
  });

  it("redacts Groq key pattern", () => {
    const result = redactSecretPatterns("gsk_abcdefghijklmnopqrstu12345");
    assert.ok(result.includes("[REDACTED_SECRET]"));
  });

  it("redacts Gemini key pattern", () => {
    const result = redactSecretPatterns("AIzaABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
    assert.ok(result.includes("[REDACTED_SECRET]"));
  });

  it("redacts Bearer token", () => {
    const result = redactSecretPatterns("Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6");
    assert.ok(result.includes("[REDACTED_SECRET]"));
  });

  it("passes through normal text", () => {
    const result = redactSecretPatterns("hello world");
    assert.equal(result, "hello world");
  });
});

describe("redactPayload", () => {
  it("redacts secret fields", () => {
    const result = redactPayload({ api_key: "sk-abcdef1234567890abcdef12", userId: "u1" });
    assert.equal(result.api_key, "[REDACTED_SECRET]");
    assert.equal(result.userId, "u1");
  });

  it("redacts restricted fields", () => {
    const result = redactPayload({ prompt: "my secret code", modelFamily: "gpt" });
    assert.equal(result.prompt, "[REDACTED]");
    assert.equal(result.modelFamily, "gpt");
  });

  it("redacts nested objects", () => {
    const result = redactPayload({
      config: { authorization: "Bearer xyz1234567890", model: "gpt-4" }
    });
    assert.equal(result.config.authorization, "[REDACTED_SECRET]");
    assert.equal(result.config.model, "gpt-4");
  });

  it("redacts arrays", () => {
    const result = redactPayload({ items: [{ prompt: "test" }, { status: "ok" }] });
    assert.equal(result.items[0].prompt, "[REDACTED]");
    assert.equal(result.items[1].status, "ok");
  });

  it("handles null and primitives", () => {
    assert.equal(redactPayload(null), null);
    assert.equal(redactPayload(42), 42);
    assert.equal(redactPayload(true), true);
  });

  it("redacts API key patterns in string values", () => {
    const result = redactPayload({ note: "using sk-testkey12345678901234567" });
    assert.ok(!result.note.includes("sk-testkey"));
  });

  it("respects maxDepth", () => {
    const deep = { a: { b: { c: { d: "value" } } } };
    const result = redactPayload(deep, { maxDepth: 2 });
    assert.equal(result.a.b, "[REDACTED]");
  });

  it("supports additional secret fields", () => {
    const result = redactPayload(
      { customSecret: "myval", ok: "fine" },
      { additionalSecretFields: ["customSecret"] }
    );
    assert.equal(result.customSecret, "[REDACTED_SECRET]");
    assert.equal(result.ok, "fine");
  });

  it("supports additional restricted fields", () => {
    const result = redactPayload(
      { myData: "content", ok: "fine" },
      { additionalRestrictedFields: ["myData"] }
    );
    assert.equal(result.myData, "[REDACTED]");
  });
});

describe("createSafeLogger", () => {
  it("redacts data passed to logger", () => {
    const logs = [];
    const logger = createSafeLogger({
      logger: (level, message, data) => logs.push({ level, message, data })
    });
    logger.info("test", { api_key: "sk-secret12345678901234567", model: "gpt-4" });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].data.api_key, "[REDACTED_SECRET]");
    assert.equal(logs[0].data.model, "gpt-4");
  });

  it("handles all log levels", () => {
    const logs = [];
    const logger = createSafeLogger({
      logger: (level) => logs.push(level)
    });
    logger.info("a", {});
    logger.warn("b", {});
    logger.error("c", {});
    logger.debug("d", {});
    assert.deepEqual(logs, ["info", "warn", "error", "debug"]);
  });

  it("handles undefined data", () => {
    const logs = [];
    const logger = createSafeLogger({
      logger: (_level, _message, data) => logs.push(data)
    });
    logger.info("test");
    assert.equal(logs[0], undefined);
  });
});

describe("detectLeaks", () => {
  it("detects OpenAI key pattern", () => {
    const leaks = detectLeaks("found sk-abcdefghijklmnopqrstuvwxyz");
    assert.ok(leaks.includes("openai_key_pattern"));
  });

  it("detects multiple patterns", () => {
    const leaks = detectLeaks("sk-abcdefghijklmnopqrstuvwxyz and gsk_abcdefghijklmnopqrstuvwxyz");
    assert.ok(leaks.includes("openai_key_pattern"));
    assert.ok(leaks.includes("groq_key_pattern"));
  });

  it("returns empty for clean output", () => {
    const leaks = detectLeaks("model=gpt-4 status=ok");
    assert.equal(leaks.length, 0);
  });

  it("detects Bearer token", () => {
    const leaks = detectLeaks("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    assert.ok(leaks.includes("bearer_token_pattern"));
  });
});
