import { z } from "zod";

export const modelFamilySchema = z.enum(["claude", "gpt", "gemini", "local"]);
export type ModelFamily = z.infer<typeof modelFamilySchema>;

export const outputFormatSchema = z.enum(["xml", "json", "markdown", "text"]);
export type OutputFormat = z.infer<typeof outputFormatSchema>;

export const optimizePromptRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  modelFamily: modelFamilySchema,
  outputFormat: outputFormatSchema
});
export type OptimizePromptRequest = z.infer<typeof optimizePromptRequestSchema>;

export const optimizePromptResponseSchema = z.object({
  optimizedPrompt: z.string().min(1),
  score: z.number().int().min(0).max(100)
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
