import assert from "node:assert/strict";
import test from "node:test";

import {
  validateTemplate,
  migrateTemplate,
  extractVariableKeys,
  validateVariableValues,
  resolveTemplate,
  getSupportedVersions,
  CURRENT_SCHEMA_VERSION,
  getStarterCatalog,
  getCatalogMeta,
  filterCatalog,
  getCatalogTemplateById,
  listCatalogCategories,
  listCatalogTags,
  exportTemplates,
  parseImportPayload,
  importTemplates
} from "../dist/index.js";

// --- Helpers ---

function validTemplate(overrides = {}) {
  return {
    id: "tpl-test-001",
    schemaVersion: "1.0",
    title: "Test Template",
    category: "debug",
    description: "A test template for unit tests.",
    tier: "starter_free",
    modelFamilies: ["claude", "gpt"],
    promptBody: "Analyze this {{language}} code:\n{{code_snippet}}",
    variables: [
      { key: "language", type: "enum", required: true, description: "Primary language", enumValues: ["typescript", "python", "go"] },
      { key: "code_snippet", type: "code", required: true, description: "Code to analyze" }
    ],
    ...overrides
  };
}

// --- ST-06-01: Template schema validation ---

test("validateTemplate accepts valid template", () => {
  const result = validateTemplate(validTemplate());
  assert.equal(result.valid, true);
  assert.ok(result.template);
  assert.equal(result.template.id, "tpl-test-001");
  assert.equal(result.errors.length, 0);
});

test("validateTemplate rejects missing required field", () => {
  const { title, ...noTitle } = validTemplate();
  void title;
  const result = validateTemplate(noTitle);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes("title")));
});

test("validateTemplate rejects invalid category", () => {
  const result = validateTemplate(validTemplate({ category: "invalid_cat" }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes("category")));
});

test("validateTemplate rejects invalid model family", () => {
  const result = validateTemplate(validTemplate({ modelFamilies: ["unknown_family"] }));
  assert.equal(result.valid, false);
});

test("validateTemplate rejects empty modelFamilies", () => {
  const result = validateTemplate(validTemplate({ modelFamilies: [] }));
  assert.equal(result.valid, false);
});

test("validateTemplate rejects wrong schemaVersion", () => {
  const result = validateTemplate(validTemplate({ schemaVersion: "2.0" }));
  assert.equal(result.valid, false);
});

test("validateTemplate detects duplicate variable keys", () => {
  const result = validateTemplate(
    validTemplate({
      variables: [
        { key: "name", type: "text", required: true, description: "Name" },
        { key: "name", type: "text", required: false, description: "Name again" }
      ],
      promptBody: "Hello {{name}}"
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "duplicate_variable_key"));
});

test("validateTemplate detects enum variable without enumValues", () => {
  const result = validateTemplate(
    validTemplate({
      variables: [
        { key: "lang", type: "enum", required: true, description: "Language" }
      ],
      promptBody: "Use {{lang}}"
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "enum_missing_values"));
});

test("validateTemplate detects minLength > maxLength", () => {
  const result = validateTemplate(
    validTemplate({
      variables: [
        { key: "name", type: "text", required: true, description: "Name", minLength: 100, maxLength: 10 }
      ],
      promptBody: "Hello {{name}}"
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "invalid_length_range"));
});

test("validateTemplate detects unreferenced placeholder in promptBody", () => {
  const result = validateTemplate(
    validTemplate({
      variables: [
        { key: "name", type: "text", required: true, description: "Name" }
      ],
      promptBody: "Hello {{name}} and {{unknown_var}}"
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "unreferenced_placeholder"));
});

test("validateTemplate accepts optional fields", () => {
  const result = validateTemplate(
    validTemplate({
      suggestedTechniques: ["chain-of-thought"],
      tags: ["performance", "debug"],
      metadata: { author: "test" }
    })
  );
  assert.equal(result.valid, true);
});

test("validateTemplate rejects invalid variable key format", () => {
  const result = validateTemplate(
    validTemplate({
      variables: [
        { key: "CamelCase", type: "text", required: true, description: "Bad key" }
      ],
      promptBody: "Hello {{CamelCase}}"
    })
  );
  assert.equal(result.valid, false);
});

// --- ST-06-01: Migration framework ---

test("migrateTemplate passes through current version", () => {
  const input = validTemplate();
  const result = migrateTemplate(input);
  assert.ok(!("error" in result));
  assert.deepEqual(result.appliedMigrations, []);
  assert.equal(result.migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
});

test("migrateTemplate rejects newer version", () => {
  const result = migrateTemplate({ schemaVersion: "99.0" });
  assert.ok("error" in result);
  assert.ok(result.error.includes("newer"));
});

test("migrateTemplate rejects pre-v1 version", () => {
  const result = migrateTemplate({ schemaVersion: "0.5" });
  assert.ok("error" in result);
  assert.ok(result.error.includes("unsupported"));
});

test("migrateTemplate rejects non-object input", () => {
  const result = migrateTemplate("not an object");
  assert.ok("error" in result);
});

test("migrateTemplate rejects missing schemaVersion", () => {
  const result = migrateTemplate({ id: "test" });
  assert.ok("error" in result);
  assert.ok(result.error.includes("schemaVersion"));
});

test("getSupportedVersions includes current", () => {
  const versions = getSupportedVersions();
  assert.ok(versions.includes(CURRENT_SCHEMA_VERSION));
});

// --- ST-06-02: Variable extraction ---

test("extractVariableKeys extracts all placeholders", () => {
  const keys = extractVariableKeys("Hello {{name}}, your {{role}} is {{status}}.");
  assert.deepEqual(keys.sort(), ["name", "role", "status"]);
});

test("extractVariableKeys deduplicates repeated placeholders", () => {
  const keys = extractVariableKeys("{{name}} is {{name}} is {{name}}");
  assert.deepEqual(keys, ["name"]);
});

test("extractVariableKeys returns empty for no placeholders", () => {
  const keys = extractVariableKeys("No variables here.");
  assert.deepEqual(keys, []);
});

test("extractVariableKeys ignores invalid placeholder format", () => {
  const keys = extractVariableKeys("{{CamelCase}} and {{ spaced }} and {{123}}");
  assert.deepEqual(keys, []);
});

// --- ST-06-02: Variable validation ---

test("validateVariableValues passes for valid values", () => {
  const variables = [
    { key: "name", type: "text", required: true, description: "Name" },
    { key: "role", type: "text", required: false, description: "Role" }
  ];
  const errors = validateVariableValues(variables, { name: "Alice" });
  assert.equal(errors.length, 0);
});

test("validateVariableValues catches required missing", () => {
  const variables = [
    { key: "name", type: "text", required: true, description: "Name" }
  ];
  const errors = validateVariableValues(variables, {});
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "required_missing");
});

test("validateVariableValues catches enum invalid value", () => {
  const variables = [
    { key: "lang", type: "enum", required: true, description: "Language", enumValues: ["ts", "py"] }
  ];
  const errors = validateVariableValues(variables, { lang: "java" });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "invalid_enum_value");
});

test("validateVariableValues allows valid enum value", () => {
  const variables = [
    { key: "lang", type: "enum", required: true, description: "Language", enumValues: ["ts", "py"] }
  ];
  const errors = validateVariableValues(variables, { lang: "ts" });
  assert.equal(errors.length, 0);
});

test("validateVariableValues catches below minLength", () => {
  const variables = [
    { key: "code", type: "code", required: true, description: "Code", minLength: 10 }
  ];
  const errors = validateVariableValues(variables, { code: "short" });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "below_min_length");
});

test("validateVariableValues catches above maxLength", () => {
  const variables = [
    { key: "code", type: "code", required: true, description: "Code", maxLength: 5 }
  ];
  const errors = validateVariableValues(variables, { code: "this is way too long" });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "above_max_length");
});

// --- ST-06-02: Template resolution ---

test("resolveTemplate replaces all placeholders", () => {
  const template = validTemplate();
  const result = resolveTemplate(template, {
    language: "typescript",
    code_snippet: "const x = 1;"
  });
  assert.equal(result.errors.length, 0);
  assert.ok(result.resolved);
  assert.ok(result.resolved.includes("typescript"));
  assert.ok(result.resolved.includes("const x = 1;"));
  assert.ok(!result.resolved.includes("{{"));
});

test("resolveTemplate uses default values for optional variables", () => {
  const template = validTemplate({
    variables: [
      { key: "name", type: "text", required: true, description: "Name" },
      { key: "greeting", type: "text", required: false, description: "Greeting", defaultValue: "Hello" }
    ],
    promptBody: "{{greeting}} {{name}}"
  });
  const result = resolveTemplate(template, { name: "Alice" });
  assert.equal(result.errors.length, 0);
  assert.equal(result.resolved, "Hello Alice");
});

test("resolveTemplate rejects missing required variable", () => {
  const template = validTemplate();
  const result = resolveTemplate(template, { language: "typescript" });
  assert.ok(result.errors.length > 0);
  assert.equal(result.resolved, undefined);
});

test("resolveTemplate rejects invalid enum value during resolution", () => {
  const template = validTemplate();
  const result = resolveTemplate(template, {
    language: "rust",
    code_snippet: "fn main() {}"
  });
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some((e) => e.code === "invalid_enum_value"));
});

// --- ST-06-04: Starter template catalog ---

test("getStarterCatalog returns 15 templates", () => {
  const catalog = getStarterCatalog();
  assert.equal(catalog.length, 15);
});

test("getCatalogMeta returns correct metadata", () => {
  const meta = getCatalogMeta();
  assert.equal(meta.templateCount, 15);
  assert.ok(meta.categories.includes("debug"));
  assert.ok(meta.categories.includes("review"));
  assert.ok(meta.categories.includes("refactor"));
  assert.ok(meta.categories.includes("test"));
  assert.ok(meta.categories.includes("design"));
  assert.ok(meta.categories.includes("custom"));
  assert.equal(meta.categories.length, 6);
});

test("filterCatalog by category returns correct subset", () => {
  const debug = filterCatalog({ category: "debug" });
  assert.equal(debug.length, 3);
  assert.ok(debug.every((t) => t.category === "debug"));

  const review = filterCatalog({ category: "review" });
  assert.equal(review.length, 3);
});

test("filterCatalog by modelFamily", () => {
  const localOnly = filterCatalog({ modelFamily: "local" });
  assert.ok(localOnly.length > 0);
  assert.ok(localOnly.every((t) => t.modelFamilies.includes("local")));

  // Security review does not support local
  assert.ok(!localOnly.some((t) => t.id === "tpl-review-security-focused-v1"));
});

test("filterCatalog by tag", () => {
  const security = filterCatalog({ tag: "security" });
  assert.equal(security.length, 1);
  assert.equal(security[0].id, "tpl-review-security-focused-v1");
});

test("filterCatalog by search term", () => {
  const results = filterCatalog({ search: "regression" });
  assert.ok(results.length >= 1);
  assert.ok(results.some((t) => t.id === "tpl-test-regression-guardrails-v1"));
});

test("filterCatalog with multiple filters", () => {
  const results = filterCatalog({ category: "refactor", modelFamily: "local" });
  assert.ok(results.length > 0);
  assert.ok(results.every((t) => t.category === "refactor" && t.modelFamilies.includes("local")));
});

test("getCatalogTemplateById returns correct template", () => {
  const found = getCatalogTemplateById("tpl-custom-prompt-optimizer-v1");
  assert.ok(found);
  assert.equal(found.title, "Custom Prompt Optimizer");
  assert.equal(found.category, "custom");
});

test("getCatalogTemplateById returns undefined for missing", () => {
  const found = getCatalogTemplateById("nonexistent");
  assert.equal(found, undefined);
});

test("listCatalogCategories returns sorted categories", () => {
  const cats = listCatalogCategories();
  assert.deepEqual(cats, ["custom", "debug", "design", "refactor", "review", "test"]);
});

test("listCatalogTags returns all unique tags", () => {
  const tags = listCatalogTags();
  assert.ok(tags.length > 0);
  assert.ok(tags.includes("bug"));
  assert.ok(tags.includes("security"));
  assert.ok(tags.includes("unit-test"));
  assert.ok(tags.includes("optimizer"));
});

test("all starter templates have valid schemaVersion", () => {
  const catalog = getStarterCatalog();
  for (const t of catalog) {
    assert.equal(t.schemaVersion, "1.0", `Template ${t.id} has wrong schemaVersion`);
  }
});

test("all starter templates have non-empty variables", () => {
  const catalog = getStarterCatalog();
  for (const t of catalog) {
    assert.ok(t.variables.length > 0, `Template ${t.id} has no variables`);
    for (const v of t.variables) {
      assert.ok(v.key, `Template ${t.id} variable missing key`);
      assert.ok(v.type, `Template ${t.id} variable missing type`);
    }
  }
});

// --- ST-06-05: Import/Export and Conflict Handling ---

test("exportTemplates produces valid JSON envelope", () => {
  const templates = [validTemplate()];
  const json = exportTemplates(templates, "json");
  const parsed = JSON.parse(json);
  assert.equal(parsed.exportVersion, "1.0");
  assert.equal(parsed.schemaVersion, "1.0");
  assert.equal(parsed.templateCount, 1);
  assert.equal(parsed.templates.length, 1);
  assert.equal(parsed.templates[0].id, "tpl-test-001");
  assert.ok(parsed.exportedAt);
});

test("exportTemplates produces valid YAML envelope", () => {
  const templates = [validTemplate()];
  const yamlStr = exportTemplates(templates, "yaml");
  assert.ok(yamlStr.includes("exportVersion"));
  assert.ok(yamlStr.includes("tpl-test-001"));
  // Verify it round-trips
  const { templates: reimported, errors } = parseImportPayload(yamlStr, "yaml");
  assert.equal(errors.length, 0);
  assert.equal(reimported.length, 1);
});

test("exportTemplates defaults to JSON", () => {
  const json = exportTemplates([validTemplate()]);
  const parsed = JSON.parse(json);
  assert.equal(parsed.exportVersion, "1.0");
});

test("parseImportPayload parses JSON envelope", () => {
  const json = exportTemplates([validTemplate()], "json");
  const { envelope, templates, errors } = parseImportPayload(json, "json");
  assert.equal(errors.length, 0);
  assert.ok(envelope);
  assert.equal(envelope.exportVersion, "1.0");
  assert.equal(templates.length, 1);
});

test("parseImportPayload parses YAML envelope", () => {
  const yamlStr = exportTemplates([validTemplate()], "yaml");
  const { envelope, templates, errors } = parseImportPayload(yamlStr, "yaml");
  assert.equal(errors.length, 0);
  assert.ok(envelope);
  assert.equal(templates.length, 1);
});

test("parseImportPayload handles bare array", () => {
  const json = JSON.stringify([validTemplate()]);
  const { envelope, templates, errors } = parseImportPayload(json, "json");
  assert.equal(errors.length, 0);
  assert.equal(envelope, undefined);
  assert.equal(templates.length, 1);
});

test("parseImportPayload handles single template object", () => {
  const json = JSON.stringify(validTemplate());
  const { templates, errors } = parseImportPayload(json, "json");
  assert.equal(errors.length, 0);
  assert.equal(templates.length, 1);
});

test("parseImportPayload returns error for malformed JSON", () => {
  const { errors } = parseImportPayload("{not valid json", "json");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "parse_error");
});

test("parseImportPayload returns error for malformed YAML", () => {
  const badYaml = ":\n  - :\n    bad: [";
  const { errors } = parseImportPayload(badYaml, "yaml");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "parse_error");
});

test("importTemplates imports new templates without conflicts", () => {
  const json = JSON.stringify([validTemplate()]);
  const result = importTemplates(json, "json", [], "skip");
  assert.equal(result.errors.length, 0);
  assert.equal(result.imported.length, 1);
  assert.equal(result.conflicts.length, 0);
});

test("importTemplates skip strategy skips duplicates", () => {
  const existing = [validTemplate()];
  const json = JSON.stringify([validTemplate({ title: "Updated Title" })]);
  const result = importTemplates(json, "json", existing, "skip");
  assert.equal(result.imported.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].resolution, "skip");
});

test("importTemplates overwrite strategy replaces duplicates", () => {
  const existing = [validTemplate()];
  const json = JSON.stringify([validTemplate({ title: "Updated Title" })]);
  const result = importTemplates(json, "json", existing, "overwrite");
  assert.equal(result.imported.length, 0);
  assert.equal(result.overwritten.length, 1);
  assert.equal(result.overwritten[0].title, "Updated Title");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].resolution, "overwrite");
});

test("importTemplates clone-with-new-id strategy creates new id", () => {
  const existing = [validTemplate()];
  const json = JSON.stringify([validTemplate()]);
  const result = importTemplates(json, "json", existing, "clone-with-new-id");
  assert.equal(result.imported.length, 0);
  assert.equal(result.cloned.length, 1);
  assert.ok(result.cloned[0].id.startsWith("tpl-test-001-clone-"));
  assert.notEqual(result.cloned[0].id, "tpl-test-001");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].resolution, "clone-with-new-id");
});

test("importTemplates rejects invalid templates with errors", () => {
  const bad = [{ id: "bad", schemaVersion: "999" }];
  const json = JSON.stringify(bad);
  const result = importTemplates(json, "json", [], "skip");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, "validation_error");
  assert.equal(result.imported.length, 0);
});

test("importTemplates handles mix of valid and invalid", () => {
  const mixed = [validTemplate(), { id: "bad" }];
  const json = JSON.stringify(mixed);
  const result = importTemplates(json, "json", [], "skip");
  assert.equal(result.imported.length, 1);
  assert.equal(result.errors.length, 1);
});

test("importTemplates round-trip JSON export then import", () => {
  const original = [validTemplate(), validTemplate({ id: "tpl-test-002", title: "Second" })];
  const exported = exportTemplates(original, "json");
  const result = importTemplates(exported, "json", [], "skip");
  assert.equal(result.errors.length, 0);
  assert.equal(result.imported.length, 2);
});

test("importTemplates round-trip YAML export then import", () => {
  const original = [validTemplate(), validTemplate({ id: "tpl-test-002", title: "Second" })];
  const exported = exportTemplates(original, "yaml");
  const result = importTemplates(exported, "yaml", [], "skip");
  assert.equal(result.errors.length, 0);
  assert.equal(result.imported.length, 2);
});

test("importTemplates returns parse error for garbage input", () => {
  const result = importTemplates("not valid at all {{", "json", [], "skip");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, "parse_error");
});
