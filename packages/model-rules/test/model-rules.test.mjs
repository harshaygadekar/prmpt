import assert from "node:assert/strict";
import test from "node:test";

import {
  getRulePack,
  validateRulePack,
  listModelFamilies,
  getRulePackVersion
} from "../dist/index.js";

test("getRulePack returns valid claude pack", () => {
  const pack = getRulePack("claude");
  assert.equal(pack.family, "claude");
  assert.equal(pack.version, "1.0.0");
  assert.ok(pack.preferredFormats.includes("xml"));
  assert.ok(pack.systemPromptTemplate.length > 0);
  assert.ok(pack.techniques.includes("xml-tagging"));
  assert.equal(pack.constraints.temperature.max, 1);
});

test("getRulePack returns valid gpt pack", () => {
  const pack = getRulePack("gpt");
  assert.equal(pack.family, "gpt");
  assert.ok(pack.preferredFormats.includes("markdown"));
  assert.ok(pack.techniques.includes("chain-of-thought"));
  assert.equal(pack.constraints.temperature.max, 2);
});

test("getRulePack returns valid gemini pack", () => {
  const pack = getRulePack("gemini");
  assert.equal(pack.family, "gemini");
  assert.ok(pack.techniques.includes("step-decomposition"));
});

test("getRulePack returns valid local pack", () => {
  const pack = getRulePack("local");
  assert.equal(pack.family, "local");
  assert.equal(pack.constraints.maxTokens, 2048);
  assert.ok(pack.techniques.includes("simplification"));
});

test("getRulePack throws for unknown family", () => {
  assert.throws(() => getRulePack("unknown"), /Unknown model family/);
});

test("validateRulePack accepts valid packs", () => {
  const pack = getRulePack("claude");
  assert.equal(validateRulePack(pack), true);
});

test("validateRulePack rejects invalid packs", () => {
  assert.equal(validateRulePack(null), false);
  assert.equal(validateRulePack({}), false);
  assert.equal(validateRulePack({ family: "claude" }), false);
  assert.equal(validateRulePack("not an object"), false);
});

test("listModelFamilies returns all four families", () => {
  const families = listModelFamilies();
  assert.equal(families.length, 4);
  assert.ok(families.includes("claude"));
  assert.ok(families.includes("gpt"));
  assert.ok(families.includes("gemini"));
  assert.ok(families.includes("local"));
});

test("getRulePackVersion returns version for all families", () => {
  for (const family of listModelFamilies()) {
    assert.equal(getRulePackVersion(family), "1.0.0");
  }
});
