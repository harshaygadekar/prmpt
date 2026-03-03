import { z } from "zod";
import YAML from "yaml";

// --- Schema version ---

export const CURRENT_SCHEMA_VERSION = "1.0";

// --- Enums ---

export const templateCategorySchema = z.enum([
  "debug",
  "review",
  "refactor",
  "test",
  "design",
  "custom"
]);
export type TemplateCategory = z.infer<typeof templateCategorySchema>;

export const templateTierSchema = z.enum(["starter_free", "premium"]);
export type TemplateTier = z.infer<typeof templateTierSchema>;

export const variableTypeSchema = z.enum(["text", "code", "file", "selection", "enum"]);
export type VariableType = z.infer<typeof variableTypeSchema>;

export const templateModelFamilySchema = z.enum(["claude", "gpt", "gemini", "local"]);
export type TemplateModelFamily = z.infer<typeof templateModelFamilySchema>;

// --- Variable definition ---

export const variableDefinitionSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Variable key must be lowercase snake_case"),
  type: variableTypeSchema,
  required: z.boolean(),
  description: z.string().min(1),
  defaultValue: z.string().optional(),
  enumValues: z.array(z.string().min(1)).optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional()
});
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;

// --- Template V1 schema ---

export const templateV1Schema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  title: z.string().min(1).max(200),
  category: templateCategorySchema,
  description: z.string().min(1).max(1000),
  tier: templateTierSchema,
  modelFamilies: z.array(templateModelFamilySchema).min(1),
  promptBody: z.string().min(1),
  variables: z.array(variableDefinitionSchema),
  suggestedTechniques: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type TemplateV1 = z.infer<typeof templateV1Schema>;

// --- Validation ---

export interface TemplateValidationError {
  code: string;
  path: string;
  message: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  template: TemplateV1 | undefined;
  errors: TemplateValidationError[];
}

export function validateTemplate(input: unknown): TemplateValidationResult {
  const result = templateV1Schema.safeParse(input);
  if (result.success) {
    // Additional cross-field validation
    const crossErrors = validateCrossFields(result.data);
    if (crossErrors.length > 0) {
      return { valid: false, template: undefined, errors: crossErrors };
    }
    return { valid: true, template: result.data, errors: [] };
  }

  const errors: TemplateValidationError[] = result.error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.join("."),
    message: issue.message
  }));

  return { valid: false, template: undefined, errors };
}

function validateCrossFields(template: TemplateV1): TemplateValidationError[] {
  const errors: TemplateValidationError[] = [];

  // Check for duplicate variable keys
  const keys = new Set<string>();
  for (const v of template.variables) {
    if (keys.has(v.key)) {
      errors.push({
        code: "duplicate_variable_key",
        path: `variables.${v.key}`,
        message: `Duplicate variable key: "${v.key}"`
      });
    }
    keys.add(v.key);
  }

  // Check enum variables have enumValues
  for (const v of template.variables) {
    if (v.type === "enum" && (!v.enumValues || v.enumValues.length === 0)) {
      errors.push({
        code: "enum_missing_values",
        path: `variables.${v.key}.enumValues`,
        message: `Enum variable "${v.key}" must have at least one enumValues entry`
      });
    }
  }

  // Check minLength <= maxLength
  for (const v of template.variables) {
    if (v.minLength !== undefined && v.maxLength !== undefined && v.minLength > v.maxLength) {
      errors.push({
        code: "invalid_length_range",
        path: `variables.${v.key}`,
        message: `Variable "${v.key}" minLength (${v.minLength}) exceeds maxLength (${v.maxLength})`
      });
    }
  }

  // Check all variables referenced in promptBody exist
  const placeholders = extractVariableKeys(template.promptBody);
  for (const placeholder of placeholders) {
    if (!keys.has(placeholder)) {
      errors.push({
        code: "unreferenced_placeholder",
        path: `promptBody`,
        message: `Placeholder "{{${placeholder}}}" in promptBody has no matching variable definition`
      });
    }
  }

  return errors;
}

// --- Migration framework ---

export type MigrationFn = (input: Record<string, unknown>) => Record<string, unknown>;

export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: MigrationFn;
}

const MIGRATIONS: Migration[] = [
  // Future migrations go here, e.g.:
  // { fromVersion: "1.0", toVersion: "1.1", migrate: migrateV10ToV11 }
];

export function migrateTemplate(
  input: unknown
): { migrated: Record<string, unknown>; appliedMigrations: string[] } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Template must be a non-null object" };
  }

  const record = input as Record<string, unknown>;
  const version = record.schemaVersion;

  if (typeof version !== "string") {
    return { error: "Missing or invalid schemaVersion field" };
  }

  if (version === CURRENT_SCHEMA_VERSION) {
    return { migrated: record, appliedMigrations: [] };
  }

  // Check if version is newer than current
  if (compareVersions(version, CURRENT_SCHEMA_VERSION) > 0) {
    return {
      error: `Schema version "${version}" is newer than supported "${CURRENT_SCHEMA_VERSION}". Please upgrade the application.`
    };
  }

  // Check if version is older and unsupported (pre-v1)
  if (compareVersions(version, "1.0") < 0) {
    return {
      error: `Schema version "${version}" is unsupported. Only versions >= 1.0 are accepted.`
    };
  }

  // Apply migration chain
  let current = { ...record };
  let currentVersion = version;
  const appliedMigrations: string[] = [];

  while (currentVersion !== CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((m) => m.fromVersion === currentVersion);
    if (!migration) {
      return {
        error: `No migration path from version "${currentVersion}" to "${CURRENT_SCHEMA_VERSION}"`
      };
    }
    current = migration.migrate(current);
    appliedMigrations.push(`${migration.fromVersion} -> ${migration.toVersion}`);
    currentVersion = migration.toVersion;
  }

  return { migrated: current, appliedMigrations };
}

function compareVersions(a: string, b: string): number {
  const [aMajor = 0, aMinor = 0] = a.split(".").map(Number);
  const [bMajor = 0, bMinor = 0] = b.split(".").map(Number);
  if (aMajor !== bMajor) return aMajor - bMajor;
  return aMinor - bMinor;
}

export function getSupportedVersions(): string[] {
  const versions = new Set<string>([CURRENT_SCHEMA_VERSION]);
  for (const m of MIGRATIONS) {
    versions.add(m.fromVersion);
    versions.add(m.toVersion);
  }
  return [...versions].sort((a, b) => compareVersions(a, b));
}

// --- Variable engine (ST-06-02) ---

const PLACEHOLDER_REGEX = /\{\{([a-z][a-z0-9_]*)\}\}/g;

export function extractVariableKeys(promptBody: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, PLACEHOLDER_REGEX.flags);
  while ((match = regex.exec(promptBody)) !== null) {
    const key = match[1];
    if (key !== undefined) {
      keys.add(key);
    }
  }
  return [...keys];
}

export interface VariableResolutionError {
  key: string;
  code: string;
  message: string;
}

export interface VariableResolutionResult {
  resolved: string | undefined;
  errors: VariableResolutionError[];
}

export function validateVariableValues(
  variables: VariableDefinition[],
  values: Record<string, string>
): VariableResolutionError[] {
  const errors: VariableResolutionError[] = [];

  for (const v of variables) {
    const value = values[v.key];

    if (v.required && (value === undefined || value === "")) {
      errors.push({
        key: v.key,
        code: "required_missing",
        message: `Required variable "${v.key}" is missing or empty`
      });
      continue;
    }

    if (value === undefined || value === "") {
      continue; // optional + not provided — fine
    }

    // length constraints
    if (v.minLength !== undefined && value.length < v.minLength) {
      errors.push({
        key: v.key,
        code: "below_min_length",
        message: `Variable "${v.key}" length ${value.length} is below minimum ${v.minLength}`
      });
    }

    if (v.maxLength !== undefined && value.length > v.maxLength) {
      errors.push({
        key: v.key,
        code: "above_max_length",
        message: `Variable "${v.key}" length ${value.length} exceeds maximum ${v.maxLength}`
      });
    }

    // enum constraint
    if (v.type === "enum" && v.enumValues && v.enumValues.length > 0) {
      if (!v.enumValues.includes(value)) {
        errors.push({
          key: v.key,
          code: "invalid_enum_value",
          message: `Variable "${v.key}" value "${value}" is not in allowed values: ${v.enumValues.join(", ")}`
        });
      }
    }
  }

  return errors;
}

export function resolveTemplate(
  template: TemplateV1,
  values: Record<string, string>
): VariableResolutionResult {
  const errors = validateVariableValues(template.variables, values);
  if (errors.length > 0) {
    return { resolved: undefined, errors };
  }

  // Build values map with defaults applied
  const effectiveValues: Record<string, string> = {};
  for (const v of template.variables) {
    const provided = values[v.key];
    if (provided !== undefined && provided !== "") {
      effectiveValues[v.key] = provided;
    } else if (v.defaultValue !== undefined) {
      effectiveValues[v.key] = v.defaultValue;
    }
  }

  // Replace placeholders
  const resolved = template.promptBody.replace(
    PLACEHOLDER_REGEX,
    (_match, key: string) => effectiveValues[key] ?? `{{${key}}}`
  );

  // Check for unresolved placeholders
  const unresolvedKeys = extractVariableKeys(resolved);
  const definedKeys = new Set(template.variables.map((v) => v.key));
  const postErrors: VariableResolutionError[] = [];
  for (const key of unresolvedKeys) {
    if (definedKeys.has(key)) {
      // This is a defined variable that wasn't resolved — it's optional and had no default
      continue;
    }
    postErrors.push({
      key,
      code: "unresolved_placeholder",
      message: `Placeholder "{{${key}}}" could not be resolved`
    });
  }

  if (postErrors.length > 0) {
    return { resolved: undefined, errors: postErrors };
  }

  // Clean up remaining optional placeholders that have no value and no default
  const finalResolved = resolved.replace(
    PLACEHOLDER_REGEX,
    (_match, key: string) => effectiveValues[key] ?? ""
  );

  return { resolved: finalResolved, errors: [] };
}

// --- Legacy compatibility ---

export interface PromptTemplate {
  schemaVersion: 1;
  id: string;
  name: string;
  content: string;
  variables: { key: string; description: string; required: boolean }[];
}

export function isPromptTemplate(value: unknown): value is PromptTemplate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PromptTemplate>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.content === "string" &&
    Array.isArray(candidate.variables)
  );
}

// --- Starter template catalog (ST-06-04) ---

export interface CatalogTemplate {
  id: string;
  schemaVersion: string;
  title: string;
  category: string;
  tier: "starter_free" | "premium";
  description: string;
  modelFamilies: string[];
  suggestedTechniques: string[];
  tags: string[];
  promptBody: string;
  variables: Record<string, unknown>[];
}

export interface CatalogFilter {
  category?: string;
  modelFamily?: string;
  tier?: string;
  tag?: string;
  search?: string;
}

export interface CatalogMeta {
  catalogVersion: string;
  templateCount: number;
  categories: string[];
}

const STARTER_TEMPLATES: CatalogTemplate[] = [
  {
    id: "tpl-debug-root-cause-analysis-v1",
    schemaVersion: "1.0",
    title: "Root Cause Analysis",
    category: "debug",
    tier: "starter_free",
    description: "Diagnose a defect and return likely causes, confidence, and next actions.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["step_decomposition", "constraints_block"],
    tags: ["bug", "triage", "incident"],
    promptBody: "You are a senior debugger.\nContext:\n- Language: {{language}}\n- Runtime: {{runtime}}\n- Error: {{error_message}}\n- Reproduction steps: {{repro_steps}}\n- Relevant code:\n{{code_snippet}}\nTask:\n1) Propose top 3 root causes (ranked).\n2) Explain evidence for each.\n3) Suggest fastest verification steps.\nOutput format: {{output_format}}.",
    variables: [
      { key: "language", type: "enum", required: true, description: "Primary language" },
      { key: "runtime", type: "text", required: false, description: "Runtime details" },
      { key: "error_message", type: "text", required: true, description: "Observed error" },
      { key: "repro_steps", type: "text", required: true, description: "Reproduction sequence" },
      { key: "code_snippet", type: "code", required: true, description: "Related code excerpt" },
      { key: "output_format", type: "enum", required: true, description: "xml/json/markdown/text" }
    ]
  },
  {
    id: "tpl-debug-log-triage-v1",
    schemaVersion: "1.0",
    title: "Log Triage and Hypothesis",
    category: "debug",
    tier: "starter_free",
    description: "Analyze logs and identify probable failure chain and next checks.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["explicit_role", "step_decomposition"],
    tags: ["logs", "observability"],
    promptBody: "Act as an on-call engineer.\nLogs:\n{{logs}}\nService context:\n{{service_context}}\nGoal:\n1) Build failure timeline.\n2) Identify probable trigger.\n3) Recommend immediate mitigation and durable fix.\nConstraints:\n- No assumptions without citing log evidence.\n- Mark unknowns explicitly.\nOutput format: {{output_format}}.",
    variables: [
      { key: "logs", type: "text", required: true, description: "Raw or summarized logs" },
      { key: "service_context", type: "text", required: true, description: "Service/environment details" },
      { key: "output_format", type: "enum", required: true, description: "xml/json/markdown/text" }
    ]
  },
  {
    id: "tpl-debug-repro-minimizer-v1",
    schemaVersion: "1.0",
    title: "Minimal Reproduction Builder",
    category: "debug",
    tier: "starter_free",
    description: "Reduce a complex bug into a minimal reproducible case.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["constraint_block"],
    tags: ["repro", "isolation"],
    promptBody: "You are helping isolate a bug.\nProblem summary: {{problem_summary}}\nCurrent code/context:\n{{context_snippet}}\nTask:\n1) Produce minimal reproduction steps.\n2) List assumptions to remove.\n3) Provide a reduced code sample outline.\nSuccess condition: reproduction should fail consistently in <10 steps.",
    variables: [
      { key: "problem_summary", type: "text", required: true, description: "Issue summary" },
      { key: "context_snippet", type: "code", required: true, description: "Current code/context" }
    ]
  },
  {
    id: "tpl-review-security-focused-v1",
    schemaVersion: "1.0",
    title: "Security-Focused Code Review",
    category: "review",
    tier: "starter_free",
    description: "Review code for security vulnerabilities and misuse patterns.",
    modelFamilies: ["claude", "gpt", "gemini"],
    suggestedTechniques: ["explicit_role", "constraints_block"],
    tags: ["security", "code-review"],
    promptBody: "Review the following code for security issues.\nCode:\n{{code_snippet}}\nThreat context:\n{{threat_context}}\nDeliver:\n1) Vulnerabilities by severity.\n2) Exploit scenario per issue.\n3) Precise remediation diff guidance.\n4) Tests to prevent regression.",
    variables: [
      { key: "code_snippet", type: "code", required: true, description: "Code under review" },
      { key: "threat_context", type: "text", required: false, description: "Auth/data/network context" }
    ]
  },
  {
    id: "tpl-review-performance-v1",
    schemaVersion: "1.0",
    title: "Performance Review",
    category: "review",
    tier: "starter_free",
    description: "Find performance bottlenecks and suggest measurable optimizations.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["step_decomposition"],
    tags: ["performance", "profiling"],
    promptBody: "Review this code path for performance optimization.\nCode:\n{{code_snippet}}\nWorkload assumptions:\n{{workload}}\nCurrent metrics:\n{{current_metrics}}\nReturn:\n1) Top bottlenecks (ranked).\n2) Expected impact estimate.\n3) Safe optimization plan with tradeoffs.",
    variables: [
      { key: "code_snippet", type: "code", required: true, description: "Code path" },
      { key: "workload", type: "text", required: false, description: "Traffic/data profile" },
      { key: "current_metrics", type: "text", required: false, description: "Latency/cost baseline" }
    ]
  },
  {
    id: "tpl-review-pr-quality-gate-v1",
    schemaVersion: "1.0",
    title: "PR Quality Gate Review",
    category: "review",
    tier: "starter_free",
    description: "Perform structured PR review with blocking/non-blocking feedback.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["ordered_requirements"],
    tags: ["pr", "maintainability"],
    promptBody: "Act as a strict reviewer.\nPR summary: {{pr_summary}}\nDiff:\n{{diff_snippet}}\nChecklist:\n{{review_checklist}}\nOutput:\n- Blocking issues\n- Non-blocking suggestions\n- Missing tests/docs\n- Merge recommendation (yes/no with rationale).",
    variables: [
      { key: "pr_summary", type: "text", required: true, description: "PR purpose" },
      { key: "diff_snippet", type: "code", required: true, description: "Diff excerpt" },
      { key: "review_checklist", type: "text", required: false, description: "Team review checklist" }
    ]
  },
  {
    id: "tpl-refactor-safe-extraction-v1",
    schemaVersion: "1.0",
    title: "Safe Function Extraction",
    category: "refactor",
    tier: "starter_free",
    description: "Refactor large functions into smaller units without behavior drift.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["step_decomposition", "constraints_block"],
    tags: ["refactor", "maintainability"],
    promptBody: "Refactor this code for readability and maintainability while preserving behavior.\nCode:\n{{code_snippet}}\nConstraints:\n{{constraints}}\nDeliver:\n1) Refactor plan in steps.\n2) Updated code.\n3) Risks and verification tests.",
    variables: [
      { key: "code_snippet", type: "code", required: true, description: "Code to refactor" },
      { key: "constraints", type: "text", required: false, description: "No API changes, perf limits, etc." }
    ]
  },
  {
    id: "tpl-refactor-legacy-modernization-v1",
    schemaVersion: "1.0",
    title: "Legacy Modernization Plan",
    category: "refactor",
    tier: "starter_free",
    description: "Create phased modernization strategy for legacy modules.",
    modelFamilies: ["claude", "gpt", "gemini"],
    suggestedTechniques: ["step_decomposition", "constraints_block"],
    tags: ["legacy", "migration"],
    promptBody: "Modernize this legacy component safely.\nLegacy snapshot:\n{{legacy_code}}\nCurrent pain points:\n{{pain_points}}\nConstraints:\n{{constraints}}\nOutput:\n- Phase-by-phase plan\n- Refactor targets per phase\n- Rollback strategy\n- Validation checklist.",
    variables: [
      { key: "legacy_code", type: "code", required: true, description: "Legacy component snapshot" },
      { key: "pain_points", type: "text", required: true, description: "Known problems" },
      { key: "constraints", type: "text", required: false, description: "Compatibility/SLA constraints" }
    ]
  },
  {
    id: "tpl-refactor-api-simplification-v1",
    schemaVersion: "1.0",
    title: "API Simplification Refactor",
    category: "refactor",
    tier: "starter_free",
    description: "Simplify API surface while retaining compatibility guidance.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["ordered_requirements"],
    tags: ["api", "design"],
    promptBody: "Simplify this API design.\nCurrent API:\n{{api_definition}}\nClient constraints:\n{{client_constraints}}\nDeliver:\n1) Proposed simplified API.\n2) Deprecation map from old to new.\n3) Migration examples.\n4) Backward compatibility risks.",
    variables: [
      { key: "api_definition", type: "text", required: true, description: "Current API contracts" },
      { key: "client_constraints", type: "text", required: false, description: "Consumer compatibility limits" }
    ]
  },
  {
    id: "tpl-test-unit-cases-v1",
    schemaVersion: "1.0",
    title: "Unit Test Case Generator",
    category: "test",
    tier: "starter_free",
    description: "Generate high-value unit tests with edge-case coverage.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["ordered_requirements"],
    tags: ["unit-test", "coverage"],
    promptBody: "Generate unit tests for this function/module.\nCode:\n{{code_snippet}}\nTest framework: {{test_framework}}\nRequirements:\n{{requirements}}\nOutput:\n- Test cases grouped by happy path, edge cases, failure paths.\n- Include test names and intent.",
    variables: [
      { key: "code_snippet", type: "code", required: true, description: "Function/module under test" },
      { key: "test_framework", type: "enum", required: true, description: "jest/vitest/pytest/etc" },
      { key: "requirements", type: "text", required: false, description: "Behavior requirements" }
    ]
  },
  {
    id: "tpl-test-integration-matrix-v1",
    schemaVersion: "1.0",
    title: "Integration Test Matrix",
    category: "test",
    tier: "starter_free",
    description: "Design integration scenarios across service boundaries.",
    modelFamilies: ["claude", "gpt", "gemini"],
    suggestedTechniques: ["step_decomposition"],
    tags: ["integration", "system-test"],
    promptBody: "Create an integration test matrix.\nServices/components:\n{{components}}\nData contracts:\n{{contracts}}\nRisk areas:\n{{risk_areas}}\nOutput:\n1) Scenario matrix\n2) Required fixtures/mocks\n3) Failure-injection cases\n4) Pass/fail criteria.",
    variables: [
      { key: "components", type: "text", required: true, description: "Components in scope" },
      { key: "contracts", type: "text", required: false, description: "Key contracts/interfaces" },
      { key: "risk_areas", type: "text", required: false, description: "High-risk paths" }
    ]
  },
  {
    id: "tpl-test-regression-guardrails-v1",
    schemaVersion: "1.0",
    title: "Regression Guardrail Plan",
    category: "test",
    tier: "starter_free",
    description: "Propose tests that prevent known regressions from recurring.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["constraints_block"],
    tags: ["regression", "qa"],
    promptBody: "Build a regression prevention plan.\nIncident history:\n{{incident_history}}\nCurrent test suite summary:\n{{test_suite_summary}}\nReturn:\n- Missing regression tests\n- Priority order\n- Automation level recommendation\n- Ownership suggestions.",
    variables: [
      { key: "incident_history", type: "text", required: true, description: "Prior failures" },
      { key: "test_suite_summary", type: "text", required: false, description: "Current test landscape" }
    ]
  },
  {
    id: "tpl-design-adr-draft-v1",
    schemaVersion: "1.0",
    title: "ADR Draft Assistant",
    category: "design",
    tier: "starter_free",
    description: "Draft Architecture Decision Record with options and tradeoffs.",
    modelFamilies: ["claude", "gpt", "gemini"],
    suggestedTechniques: ["ordered_requirements", "constraints_block"],
    tags: ["architecture", "adr"],
    promptBody: "Draft an ADR.\nDecision topic: {{decision_topic}}\nContext: {{context}}\nOptions considered: {{options}}\nConstraints: {{constraints}}\nOutput:\n- Title\n- Context\n- Decision\n- Consequences\n- Rejected alternatives.",
    variables: [
      { key: "decision_topic", type: "text", required: true, description: "Decision subject" },
      { key: "context", type: "text", required: true, description: "Background" },
      { key: "options", type: "text", required: true, description: "Candidate approaches" },
      { key: "constraints", type: "text", required: false, description: "Budget/perf/team constraints" }
    ]
  },
  {
    id: "tpl-design-service-boundary-v1",
    schemaVersion: "1.0",
    title: "Service Boundary Definition",
    category: "design",
    tier: "starter_free",
    description: "Define service boundaries, ownership, and interfaces.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["step_decomposition"],
    tags: ["service-design", "interfaces"],
    promptBody: "Define service boundaries for this system.\nSystem summary: {{system_summary}}\nCurrent pain points: {{pain_points}}\nOutput:\n1) Proposed boundaries\n2) Ownership map\n3) API/event contracts per boundary\n4) Risks and migration plan.",
    variables: [
      { key: "system_summary", type: "text", required: true, description: "Current architecture snapshot" },
      { key: "pain_points", type: "text", required: false, description: "Known architecture issues" }
    ]
  },
  {
    id: "tpl-custom-prompt-optimizer-v1",
    schemaVersion: "1.0",
    title: "Custom Prompt Optimizer",
    category: "custom",
    tier: "starter_free",
    description: "General template to optimize any engineering prompt quickly.",
    modelFamilies: ["claude", "gpt", "gemini", "local"],
    suggestedTechniques: ["explicit_role", "constraints_block"],
    tags: ["general", "optimizer"],
    promptBody: "Optimize the following raw prompt for engineering use.\nRaw prompt:\n{{raw_prompt}}\nTarget model family: {{model_family}}\nDesired output format: {{output_format}}\nConstraints:\n{{constraints}}\nReturn:\n1) Optimized prompt\n2) Key improvements made\n3) Optional follow-up questions if context is missing.",
    variables: [
      { key: "raw_prompt", type: "text", required: true, description: "Unoptimized prompt" },
      { key: "model_family", type: "enum", required: true, description: "claude/gpt/gemini/local" },
      { key: "output_format", type: "enum", required: true, description: "xml/json/markdown/text" },
      { key: "constraints", type: "text", required: false, description: "Optional hard constraints" }
    ]
  }
];

export function getStarterCatalog(): CatalogTemplate[] {
  return STARTER_TEMPLATES.map((t) => ({ ...t }));
}

export function getCatalogMeta(): CatalogMeta {
  const categories = [...new Set(STARTER_TEMPLATES.map((t) => t.category))].sort();
  return {
    catalogVersion: CURRENT_SCHEMA_VERSION,
    templateCount: STARTER_TEMPLATES.length,
    categories
  };
}

export function filterCatalog(filter: CatalogFilter): CatalogTemplate[] {
  let results = [...STARTER_TEMPLATES];

  if (filter.category) {
    results = results.filter((t) => t.category === filter.category);
  }
  if (filter.modelFamily) {
    results = results.filter((t) => t.modelFamilies.includes(filter.modelFamily!));
  }
  if (filter.tier) {
    results = results.filter((t) => t.tier === filter.tier);
  }
  if (filter.tag) {
    const tagLower = filter.tag.toLowerCase();
    results = results.filter((t) => t.tags.some((tag) => tag.toLowerCase() === tagLower));
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  return results.map((t) => ({ ...t }));
}

export function getCatalogTemplateById(id: string): CatalogTemplate | undefined {
  const found = STARTER_TEMPLATES.find((t) => t.id === id);
  return found ? { ...found } : undefined;
}

export function listCatalogCategories(): string[] {
  return [...new Set(STARTER_TEMPLATES.map((t) => t.category))].sort();
}

export function listCatalogTags(): string[] {
  const tags = new Set<string>();
  for (const t of STARTER_TEMPLATES) {
    for (const tag of t.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort();
}

// --- ST-06-05: Import/Export (JSON + YAML) and Conflict Handling ---

export type ExportFormat = "json" | "yaml";

export type DuplicateStrategy = "skip" | "overwrite" | "clone-with-new-id";

export interface ExportEnvelope {
  exportVersion: "1.0";
  exportedAt: string;
  schemaVersion: string;
  templateCount: number;
  templates: TemplateV1[];
}

export interface ImportError {
  index: number;
  code: string;
  message: string;
}

export interface ImportConflict {
  templateId: string;
  title: string;
  resolution: DuplicateStrategy;
}

export interface ImportResult {
  imported: TemplateV1[];
  skipped: TemplateV1[];
  overwritten: TemplateV1[];
  cloned: TemplateV1[];
  errors: ImportError[];
  conflicts: ImportConflict[];
}

// --- Export ---

export function exportTemplates(
  templates: TemplateV1[],
  format: ExportFormat = "json"
): string {
  const envelope: ExportEnvelope = {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateCount: templates.length,
    templates
  };

  if (format === "yaml") {
    return YAML.stringify(envelope, { indent: 2 });
  }

  return JSON.stringify(envelope, null, 2);
}

// --- Import parsing ---

export function parseImportPayload(
  raw: string,
  format: ExportFormat = "json"
): { envelope: ExportEnvelope | undefined; templates: unknown[]; errors: ImportError[] } {
  let parsed: unknown;

  try {
    if (format === "yaml") {
      parsed = YAML.parse(raw);
    } else {
      parsed = JSON.parse(raw);
    }
  } catch (err) {
    return {
      envelope: undefined,
      templates: [],
      errors: [
        {
          index: -1,
          code: "parse_error",
          message: `Failed to parse ${format.toUpperCase()}: ${err instanceof Error ? err.message : String(err)}`
        }
      ]
    };
  }

  // Handle envelope format (exported by exportTemplates)
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "templates" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).templates)
  ) {
    const obj = parsed as Record<string, unknown>;
    const envelope: ExportEnvelope | undefined =
      obj.exportVersion === "1.0"
        ? {
            exportVersion: "1.0",
            exportedAt: String(obj.exportedAt ?? ""),
            schemaVersion: String(obj.schemaVersion ?? ""),
            templateCount: Number(obj.templateCount ?? 0),
            templates: [] // filled after validation
          }
        : undefined;
    return {
      envelope,
      templates: (obj.templates as unknown[]),
      errors: []
    };
  }

  // Handle bare array format
  if (Array.isArray(parsed)) {
    return { envelope: undefined, templates: parsed, errors: [] };
  }

  // Handle single template object
  if (typeof parsed === "object" && parsed !== null) {
    return { envelope: undefined, templates: [parsed], errors: [] };
  }

  return {
    envelope: undefined,
    templates: [],
    errors: [
      {
        index: -1,
        code: "invalid_structure",
        message: "Import payload must be an object, array, or envelope with templates field"
      }
    ]
  };
}

// --- Import with conflict resolution ---

let importCloneSeq = 0;

export function importTemplates(
  raw: string,
  format: ExportFormat,
  existingTemplates: TemplateV1[],
  strategy: DuplicateStrategy = "skip"
): ImportResult {
  const result: ImportResult = {
    imported: [],
    skipped: [],
    overwritten: [],
    cloned: [],
    errors: [],
    conflicts: []
  };

  const { templates: rawTemplates, errors: parseErrors } = parseImportPayload(raw, format);
  if (parseErrors.length > 0) {
    result.errors.push(...parseErrors);
    return result;
  }

  const existingById = new Map<string, TemplateV1>();
  for (const t of existingTemplates) {
    existingById.set(t.id, t);
  }

  for (let i = 0; i < rawTemplates.length; i++) {
    const rawItem = rawTemplates[i];

    // Validate against schema
    const validation = validateTemplate(rawItem);
    if (!validation.valid || !validation.template) {
      result.errors.push({
        index: i,
        code: "validation_error",
        message: `Template at index ${i} failed validation: ${validation.errors.map((e) => e.message).join("; ")}`
      });
      continue;
    }

    const template = validation.template;
    const existing = existingById.get(template.id);

    if (!existing) {
      // No conflict — import directly
      result.imported.push(template);
      existingById.set(template.id, template);
      continue;
    }

    // Conflict detected
    const conflict: ImportConflict = {
      templateId: template.id,
      title: template.title,
      resolution: strategy
    };
    result.conflicts.push(conflict);

    switch (strategy) {
      case "skip":
        result.skipped.push(template);
        break;

      case "overwrite":
        result.overwritten.push(template);
        existingById.set(template.id, template);
        break;

      case "clone-with-new-id": {
        importCloneSeq++;
        const clonedId = `${template.id}-clone-${Date.now().toString(36)}-${importCloneSeq}`;
        const cloned: TemplateV1 = { ...template, id: clonedId };
        result.cloned.push(cloned);
        existingById.set(clonedId, cloned);
        break;
      }
    }
  }

  return result;
}
