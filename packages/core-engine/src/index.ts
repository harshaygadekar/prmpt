import { getRulePack, type ModelFamily, type OutputFormat, type RulePack } from "@prmpt/model-rules";
import {
  createNoopAdapter,
  normalizeProviderError,
  type ProviderAdapter,
  type ProviderId
} from "@prmpt/provider-adapters";
import type { OptimizePromptRequest, OptimizePromptResponse } from "@prmpt/contracts";
import { getRenderer, type RenderOutput } from "./renderers.js";
import { scorePrompt, type ScoreResult } from "./scoring.js";

// Re-export sub-modules
export { getRenderer, createXmlRenderer, createJsonRenderer, createMarkdownRenderer, createTextRenderer, listRendererFormats } from "./renderers.js";
export type { Renderer, RenderInput, RenderOutput } from "./renderers.js";
export { scorePrompt } from "./scoring.js";
export type { ScoreResult, ScoreInput, DimensionScore, ReasonCode } from "./scoring.js";

// --- Pipeline types ---

export interface PassResult {
  pass: string;
  durationMs: number;
  warnings: string[];
}

export interface PipelineMetadata {
  passes: PassResult[];
  totalDurationMs: number;
  providerUsed: ProviderId;
  modelFamily: ModelFamily;
  outputFormat: OutputFormat;
  rulePackVersion: string;
  contentType: string;
}

export interface PipelineContext {
  originalPrompt: string;
  normalizedPrompt: string;
  modelFamily: ModelFamily;
  outputFormat: OutputFormat;
  rulePack: RulePack;
  enrichedPrompt: string;
  optimizedPrompt: string;
  renderedOutput: string;
  score: number;
  scoreDetails: ScoreResult | undefined;
  metadata: PipelineMetadata;
  warnings: string[];
  adapter: ProviderAdapter;
}

export interface PipelinePass {
  name: string;
  execute(context: PipelineContext): Promise<PipelineContext>;
}

// --- Built-in passes ---

export function createNormalizePass(): PipelinePass {
  return {
    name: "normalize",
    async execute(ctx) {
      const normalizedPrompt = ctx.originalPrompt.trim().replace(/\s+/g, " ");
      return { ...ctx, normalizedPrompt };
    }
  };
}

export function createAnalyzePass(): PipelinePass {
  return {
    name: "analyze",
    async execute(ctx) {
      const warnings: string[] = [...ctx.warnings];

      if (ctx.normalizedPrompt.length < 10) {
        warnings.push("Prompt is very short; optimization may have limited effect.");
      }
      if (ctx.normalizedPrompt.length > 10_000) {
        warnings.push("Prompt is very long; consider breaking it into smaller parts.");
      }

      if (!ctx.rulePack.constraints.supportedFormats.includes(ctx.outputFormat)) {
        warnings.push(
          `Output format "${ctx.outputFormat}" is not optimal for ${ctx.modelFamily}. Using "${ctx.rulePack.preferredFormats[0]}".`
        );
      }

      return { ...ctx, warnings };
    }
  };
}

export function createEnrichPass(): PipelinePass {
  return {
    name: "enrich",
    async execute(ctx) {
      return { ...ctx, enrichedPrompt: ctx.normalizedPrompt };
    }
  };
}

export function createOptimizePass(): PipelinePass {
  return {
    name: "optimize",
    async execute(ctx) {
      const preferredFormat = ctx.rulePack.preferredFormats.includes(ctx.outputFormat)
        ? ctx.outputFormat
        : ctx.rulePack.preferredFormats[0] ?? "markdown";

      const result = await ctx.adapter.optimize({
        prompt: ctx.enrichedPrompt,
        modelFamily: ctx.modelFamily,
        outputFormat: preferredFormat,
        systemPrompt: ctx.rulePack.systemPromptTemplate
      });

      return {
        ...ctx,
        optimizedPrompt: result.optimizedPrompt,
        outputFormat: preferredFormat as OutputFormat
      };
    }
  };
}

export function createRenderPass(): PipelinePass {
  return {
    name: "render",
    async execute(ctx) {
      const renderer = getRenderer(ctx.outputFormat);
      const renderResult: RenderOutput = renderer.render({
        optimizedPrompt: ctx.optimizedPrompt,
        modelFamily: ctx.modelFamily,
        outputFormat: ctx.outputFormat,
        score: ctx.score,
        warnings: ctx.warnings
      });
      return {
        ...ctx,
        renderedOutput: renderResult.rendered,
        metadata: { ...ctx.metadata, contentType: renderResult.contentType }
      };
    }
  };
}

export function createScorePass(): PipelinePass {
  return {
    name: "score",
    async execute(ctx) {
      const scoreResult = scorePrompt({
        prompt: ctx.optimizedPrompt,
        modelFamily: ctx.modelFamily,
        outputFormat: ctx.outputFormat,
        rulePack: ctx.rulePack
      });
      return {
        ...ctx,
        score: scoreResult.total,
        scoreDetails: scoreResult
      };
    }
  };
}

// --- Pipeline runner ---

const DEFAULT_PASSES: PipelinePass[] = [
  createNormalizePass(),
  createAnalyzePass(),
  createEnrichPass(),
  createOptimizePass(),
  createScorePass(),
  createRenderPass()
];

export interface PipelineOptions {
  adapter?: ProviderAdapter;
  passes?: PipelinePass[];
}

export async function runPipeline(
  input: OptimizePromptRequest,
  options: PipelineOptions = {}
): Promise<PipelineContext> {
  const startTime = Date.now();
  const passes = options.passes ?? DEFAULT_PASSES;
  const rulePack = getRulePack(input.modelFamily);
  const adapter =
    options.adapter ?? createNoopAdapter(getProviderIdForModelFamily(input.modelFamily));

  let context: PipelineContext = {
    originalPrompt: input.prompt,
    normalizedPrompt: "",
    modelFamily: input.modelFamily,
    outputFormat: input.outputFormat,
    rulePack,
    enrichedPrompt: "",
    optimizedPrompt: "",
    renderedOutput: "",
    score: 0,
    scoreDetails: undefined,
    metadata: {
      passes: [],
      totalDurationMs: 0,
      providerUsed: adapter.providerId,
      modelFamily: input.modelFamily,
      outputFormat: input.outputFormat,
      rulePackVersion: rulePack.version,
      contentType: "text/plain"
    },
    warnings: [],
    adapter
  };

  for (const pass of passes) {
    const passStart = Date.now();
    try {
      context = await pass.execute(context);
      context.metadata.passes.push({
        pass: pass.name,
        durationMs: Date.now() - passStart,
        warnings: []
      });
    } catch (error) {
      throw normalizeProviderError(error, adapter.providerId);
    }
  }

  context.metadata.totalDurationMs = Date.now() - startTime;
  return context;
}

// --- Legacy API (backward compatible) ---

export interface OptimizePromptOptions {
  adapter?: ProviderAdapter;
}

export async function optimizePrompt(
  input: OptimizePromptRequest,
  options: OptimizePromptOptions = {}
): Promise<OptimizePromptResponse> {
  const pipelineOpts: PipelineOptions = {};
  if (options.adapter !== undefined) {
    pipelineOpts.adapter = options.adapter;
  }
  const context = await runPipeline(input, pipelineOpts);
  return {
    optimizedPrompt: context.renderedOutput,
    score: context.score,
    scoreDetails: context.scoreDetails,
    metadata: {
      provider: context.metadata.providerUsed,
      modelFamily: context.metadata.modelFamily,
      outputFormat: context.metadata.outputFormat,
      rulePackVersion: context.metadata.rulePackVersion,
      totalDurationMs: context.metadata.totalDurationMs,
      passCount: context.metadata.passes.length,
      contentType: context.metadata.contentType
    }
  };
}

function getProviderIdForModelFamily(
  family: OptimizePromptRequest["modelFamily"]
): ProviderId {
  switch (family) {
    case "claude":
      return "anthropic";
    case "gpt":
      return "openai";
    case "gemini":
      return "gemini";
    case "local":
      return "ollama";
  }
}
