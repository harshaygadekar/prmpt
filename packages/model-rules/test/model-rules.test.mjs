import assert from "node:assert/strict";
import test from "node:test";

import {
  getRulePack,
  validateRulePack,
  listModelFamilies,
  getRulePackVersion,
  getTechnique,
  listTechniques,
  listTechniqueIds,
  isTechniqueId,
  getCompatibleTechniques,
  validateTechniqueSelection
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

// --- Technique Registry tests (ST-10-01) ---

test("listTechniqueIds returns all 7 technique IDs", () => {
  const ids = listTechniqueIds();
  assert.equal(ids.length, 7);
  assert.ok(ids.includes("xml-tagging"));
  assert.ok(ids.includes("role-priming"));
  assert.ok(ids.includes("step-decomposition"));
  assert.ok(ids.includes("output-constraints"));
  assert.ok(ids.includes("few-shot-priming"));
  assert.ok(ids.includes("chain-of-thought"));
  assert.ok(ids.includes("simplification"));
});

test("listTechniques returns descriptors with required fields", () => {
  const techniques = listTechniques();
  assert.equal(techniques.length, 7);
  for (const t of techniques) {
    assert.ok(t.id, "id");
    assert.ok(t.label, "label");
    assert.ok(t.description, "description");
    assert.ok(t.category, "category");
    assert.ok(Array.isArray(t.compatibleFamilies), "compatibleFamilies");
    assert.ok(Array.isArray(t.conflictsWith), "conflictsWith");
    assert.equal(typeof t.order, "number", "order");
  }
});

test("getTechnique returns correct descriptor", () => {
  const tech = getTechnique("xml-tagging");
  assert.equal(tech.id, "xml-tagging");
  assert.equal(tech.label, "XML Tagging");
  assert.equal(tech.category, "structure");
  assert.ok(tech.compatibleFamilies.includes("claude"));
});

test("isTechniqueId validates IDs correctly", () => {
  assert.equal(isTechniqueId("xml-tagging"), true);
  assert.equal(isTechniqueId("chain-of-thought"), true);
  assert.equal(isTechniqueId("unknown-technique"), false);
  assert.equal(isTechniqueId(""), false);
});

test("getCompatibleTechniques filters by model family", () => {
  const claudeTechs = getCompatibleTechniques("claude");
  assert.ok(claudeTechs.some((t) => t.id === "xml-tagging"));
  // simplification is not compatible with claude
  assert.ok(!claudeTechs.some((t) => t.id === "simplification"));

  const localTechs = getCompatibleTechniques("local");
  assert.ok(localTechs.some((t) => t.id === "simplification"));
  assert.ok(localTechs.some((t) => t.id === "role-priming"));
});

test("getCompatibleTechniques returns sorted by order", () => {
  const techs = getCompatibleTechniques("gpt");
  for (let i = 1; i < techs.length; i++) {
    assert.ok(techs[i].order >= techs[i - 1].order, `order: ${techs[i - 1].order} <= ${techs[i].order}`);
  }
});

test("validateTechniqueSelection valid set returns valid=true", () => {
  const result = validateTechniqueSelection(["xml-tagging", "role-priming"], "claude");
  assert.equal(result.valid, true);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.resolved.length === 2);
});

test("validateTechniqueSelection detects incompatible technique", () => {
  const result = validateTechniqueSelection(["simplification"], "claude");
  assert.equal(result.valid, false);
  assert.ok(result.warnings.some((w) => /not compatible/i.test(w)));
});

test("validateTechniqueSelection detects conflicts", () => {
  const result = validateTechniqueSelection(["step-decomposition", "simplification"], "local");
  assert.equal(result.valid, false);
  assert.ok(result.conflicts.length > 0);
  assert.ok(result.warnings.some((w) => /conflict/i.test(w)));
});

test("validateTechniqueSelection deduplicates inputs", () => {
  const result = validateTechniqueSelection(
    ["xml-tagging", "xml-tagging", "role-priming"],
    "claude"
  );
  assert.equal(result.resolved.length, 2);
});

test("validateTechniqueSelection resolves in deterministic order", () => {
  const r1 = validateTechniqueSelection(
    ["output-constraints", "role-priming", "xml-tagging"],
    "claude"
  );
  const r2 = validateTechniqueSelection(
    ["xml-tagging", "role-priming", "output-constraints"],
    "claude"
  );
  assert.deepEqual(r1.resolved, r2.resolved);
  // role-priming (5) < xml-tagging (10) < output-constraints (30)
  assert.equal(r1.resolved[0], "role-priming");
  assert.equal(r1.resolved[1], "xml-tagging");
  assert.equal(r1.resolved[2], "output-constraints");
});

test("RulePack techniques are typed TechniqueIds", () => {
  for (const family of listModelFamilies()) {
    const pack = getRulePack(family);
    for (const tech of pack.techniques) {
      assert.equal(isTechniqueId(tech), true, `${family} technique "${tech}" should be valid TechniqueId`);
    }
  }
});
