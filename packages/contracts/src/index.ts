import { z } from "zod";

export const modelFamilySchema = z.enum(["claude", "gpt", "gemini", "local"]);
export type ModelFamily = z.infer<typeof modelFamilySchema>;

export const outputFormatSchema = z.enum(["xml", "json", "markdown", "text"]);
export type OutputFormat = z.infer<typeof outputFormatSchema>;

export const techniqueIdSchema = z.enum([
  "xml-tagging",
  "role-priming",
  "step-decomposition",
  "output-constraints",
  "few-shot-priming",
  "chain-of-thought",
  "simplification"
]);
export type TechniqueId = z.infer<typeof techniqueIdSchema>;

export const optimizePromptRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  modelFamily: modelFamilySchema,
  outputFormat: outputFormatSchema,
  techniques: z.array(techniqueIdSchema).optional()
});
export type OptimizePromptRequest = z.infer<typeof optimizePromptRequestSchema>;

export const reasonCodeSchema = z.enum([
  "missing_constraints",
  "ambiguous_objective",
  "missing_output_contract",
  "model_family_mismatch",
  "overuse_of_techniques",
  "insufficient_context",
  "structure_inconsistency"
]);
export type ReasonCode = z.infer<typeof reasonCodeSchema>;

export const scoreDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  weighted: z.number().min(0).max(100),
  reasons: z.array(reasonCodeSchema)
});
export type ScoreDimension = z.infer<typeof scoreDimensionSchema>;

export const scoreLabelSchema = z.enum(["poor", "fair", "good", "very_good", "excellent"]);
export type ScoreLabel = z.infer<typeof scoreLabelSchema>;

export const scoreResultSchema = z.object({
  total: z.number().int().min(0).max(100),
  label: scoreLabelSchema,
  dimensions: z.array(scoreDimensionSchema),
  reasons: z.array(reasonCodeSchema)
});
export type ScoreResult = z.infer<typeof scoreResultSchema>;

export const optimizeMetadataSchema = z.object({
  provider: z.string().min(1),
  modelFamily: modelFamilySchema,
  outputFormat: outputFormatSchema,
  rulePackVersion: z.string().min(1),
  totalDurationMs: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  contentType: z.string().min(1)
});
export type OptimizeMetadata = z.infer<typeof optimizeMetadataSchema>;

export const optimizePromptResponseSchema = z.object({
  optimizedPrompt: z.string().min(1),
  score: z.number().int().min(0).max(100),
  scoreDetails: scoreResultSchema.optional(),
  metadata: optimizeMetadataSchema.optional()
});
export type OptimizePromptResponse = z.infer<typeof optimizePromptResponseSchema>;

export const bootstrapRequestSchema = z.object({
  clerkUserId: z.string().min(1),
  installationId: z.string().min(1).optional(),
  extensionVersion: z.string().min(1).optional(),
  platform: z.literal("vscode").default("vscode")
});
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;

export const bootstrapResponseSchema = z.object({
  userId: z.string().min(1),
  sessionLimit: z.number().int().min(0),
  remainingSessions: z.number().int().min(0),
  isPremium: z.boolean()
});
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;

export const usageConsumeRequestSchema = z.object({
  userId: z.string().min(1),
  sessionCount: z.number().int().positive()
});
export type UsageConsumeRequest = z.infer<typeof usageConsumeRequestSchema>;

export const usageConsumeResponseSchema = z.object({
  userId: z.string().min(1),
  consumedSessions: z.number().int().nonnegative(),
  remainingSessions: z.number().int().nonnegative(),
  isPremium: z.boolean()
});
export type UsageConsumeResponse = z.infer<typeof usageConsumeResponseSchema>;

export const entitlementReadRequestSchema = z.object({
  userId: z.string().min(1)
});
export type EntitlementReadRequest = z.infer<typeof entitlementReadRequestSchema>;

export const entitlementReadResponseSchema = z.object({
  userId: z.string().min(1),
  isPremium: z.boolean(),
  source: z.enum(["trial", "polar", "manual"]).optional()
});
export type EntitlementReadResponse = z.infer<typeof entitlementReadResponseSchema>;

export const paymentCheckoutStartRequestSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});
export type PaymentCheckoutStartRequest = z.infer<typeof paymentCheckoutStartRequestSchema>;

export const paymentCheckoutStartResponseSchema = z.object({
  provider: z.literal("polar"),
  checkoutUrl: z.string().url(),
  checkoutId: z.string().min(1).optional()
});
export type PaymentCheckoutStartResponse = z.infer<typeof paymentCheckoutStartResponseSchema>;

export const polarWebhookEventSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    data: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();
export type PolarWebhookEvent = z.infer<typeof polarWebhookEventSchema>;

export const polarWebhookReconcileResponseSchema = z.object({
  received: z.literal(true),
  processed: z.boolean(),
  duplicate: z.boolean(),
  userId: z.string().min(1).optional(),
  isPremium: z.boolean().optional()
});
export type PolarWebhookReconcileResponse = z.infer<typeof polarWebhookReconcileResponseSchema>;

// --- Template CRUD contracts (ST-06-03) ---

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

export const templateOwnershipSchema = z.enum(["builtin", "user"]);
export type TemplateOwnership = z.infer<typeof templateOwnershipSchema>;

export const templateSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: templateCategorySchema,
  tier: templateTierSchema,
  ownership: templateOwnershipSchema,
  modelFamilies: z.array(modelFamilySchema).min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).optional()
});
export type TemplateSummary = z.infer<typeof templateSummarySchema>;

export const templateCreateRequestSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  category: templateCategorySchema,
  description: z.string().min(1).max(1000),
  modelFamilies: z.array(modelFamilySchema).min(1),
  promptBody: z.string().min(1),
  variables: z.array(
    z.object({
      key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
      type: z.enum(["text", "code", "file", "selection", "enum"]),
      required: z.boolean(),
      description: z.string().min(1),
      defaultValue: z.string().optional(),
      enumValues: z.array(z.string().min(1)).optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().optional()
    })
  ),
  tags: z.array(z.string().min(1)).optional(),
  suggestedTechniques: z.array(z.string().min(1)).optional()
});
export type TemplateCreateRequest = z.infer<typeof templateCreateRequestSchema>;

export const templateUpdateRequestSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  category: templateCategorySchema.optional(),
  description: z.string().min(1).max(1000).optional(),
  modelFamilies: z.array(modelFamilySchema).min(1).optional(),
  promptBody: z.string().min(1).optional(),
  variables: z
    .array(
      z.object({
        key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
        type: z.enum(["text", "code", "file", "selection", "enum"]),
        required: z.boolean(),
        description: z.string().min(1),
        defaultValue: z.string().optional(),
        enumValues: z.array(z.string().min(1)).optional(),
        minLength: z.number().int().nonnegative().optional(),
        maxLength: z.number().int().positive().optional()
      })
    )
    .optional(),
  tags: z.array(z.string().min(1)).optional(),
  suggestedTechniques: z.array(z.string().min(1)).optional()
});
export type TemplateUpdateRequest = z.infer<typeof templateUpdateRequestSchema>;

export const templateDeleteRequestSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1)
});
export type TemplateDeleteRequest = z.infer<typeof templateDeleteRequestSchema>;

export const templateGetRequestSchema = z.object({
  userId: z.string().min(1),
  templateId: z.string().min(1)
});
export type TemplateGetRequest = z.infer<typeof templateGetRequestSchema>;

export const templateListRequestSchema = z.object({
  userId: z.string().min(1),
  category: templateCategorySchema.optional(),
  tier: templateTierSchema.optional(),
  modelFamily: modelFamilySchema.optional(),
  ownership: templateOwnershipSchema.optional(),
  search: z.string().optional()
});
export type TemplateListRequest = z.infer<typeof templateListRequestSchema>;

export const templateRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.string().min(1),
  title: z.string().min(1),
  category: templateCategorySchema,
  description: z.string().min(1),
  tier: templateTierSchema,
  ownership: templateOwnershipSchema,
  modelFamilies: z.array(modelFamilySchema).min(1),
  promptBody: z.string().min(1),
  variables: z.array(z.record(z.string(), z.unknown())),
  tags: z.array(z.string()).optional(),
  suggestedTechniques: z.array(z.string()).optional(),
  createdBy: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});
export type TemplateRecord = z.infer<typeof templateRecordSchema>;

export const templateListResponseSchema = z.object({
  templates: z.array(templateSummarySchema),
  total: z.number().int().nonnegative()
});
export type TemplateListResponse = z.infer<typeof templateListResponseSchema>;

// --- Prompt History contracts (ST-07-05) ---

export const promptHistoryEntrySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  inputPrompt: z.string().min(1),
  optimizedPrompt: z.string().min(1),
  modelFamily: modelFamilySchema,
  outputFormat: outputFormatSchema,
  provider: z.string().min(1),
  score: z.number().int().min(0).max(100).optional(),
  templateId: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type PromptHistoryEntry = z.infer<typeof promptHistoryEntrySchema>;

export const promptHistoryListRequestSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  search: z.string().optional()
});
export type PromptHistoryListRequest = z.infer<typeof promptHistoryListRequestSchema>;

export const promptHistoryListResponseSchema = z.object({
  entries: z.array(promptHistoryEntrySchema),
  total: z.number().int().nonnegative()
});
export type PromptHistoryListResponse = z.infer<typeof promptHistoryListResponseSchema>;

export const promptHistoryGetRequestSchema = z.object({
  userId: z.string().min(1),
  entryId: z.string().min(1)
});
export type PromptHistoryGetRequest = z.infer<typeof promptHistoryGetRequestSchema>;

export const promptHistoryDeleteRequestSchema = z.object({
  userId: z.string().min(1),
  entryId: z.string().min(1)
});
export type PromptHistoryDeleteRequest = z.infer<typeof promptHistoryDeleteRequestSchema>;

// --- P2 Bridge Contracts (ST-10-05) ---
// These are draft contracts for future F10 (Diff Viewer) and F11 (Prompt Wizard).
// They are NOT used in P0/P1 code paths. Feature-flagged and defer-ready.

export const diffChangeTypeSchema = z.enum(["added", "removed", "modified", "unchanged"]);
export type DiffChangeType = z.infer<typeof diffChangeTypeSchema>;

export const diffSegmentSchema = z.object({
  type: diffChangeTypeSchema,
  content: z.string(),
  lineStart: z.number().int().nonnegative(),
  lineEnd: z.number().int().nonnegative()
});
export type DiffSegment = z.infer<typeof diffSegmentSchema>;

export const diffResultSchema = z.object({
  originalPrompt: z.string().min(1),
  optimizedPrompt: z.string().min(1),
  segments: z.array(diffSegmentSchema),
  totalAdditions: z.number().int().nonnegative(),
  totalRemovals: z.number().int().nonnegative(),
  similarityScore: z.number().min(0).max(1)
});
export type DiffResult = z.infer<typeof diffResultSchema>;

export const wizardStepTypeSchema = z.enum([
  "model_selection",
  "technique_selection",
  "context_injection",
  "prompt_input",
  "review_optimize",
  "result_display"
]);
export type WizardStepType = z.infer<typeof wizardStepTypeSchema>;

export const wizardStepSchema = z.object({
  id: z.string().min(1),
  type: wizardStepTypeSchema,
  label: z.string().min(1),
  order: z.number().int().nonnegative(),
  completed: z.boolean(),
  data: z.record(z.string(), z.unknown()).optional()
});
export type WizardStep = z.infer<typeof wizardStepSchema>;

export const wizardStateSchema = z.object({
  sessionId: z.string().min(1),
  currentStepIndex: z.number().int().nonnegative(),
  steps: z.array(wizardStepSchema).min(1),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});
export type WizardState = z.infer<typeof wizardStateSchema>;
