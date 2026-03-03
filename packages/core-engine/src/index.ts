import { getRulePack } from "@prmpt/model-rules";
import {
  createNoopAdapter,
  normalizeProviderError,
  type ProviderAdapter,
  type ProviderId
} from "@prmpt/provider-adapters";
import type { OptimizePromptRequest, OptimizePromptResponse } from "@prmpt/contracts";

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

export interface OptimizePromptOptions {
  adapter?: ProviderAdapter;
}

export async function optimizePrompt(
  input: OptimizePromptRequest,
  options: OptimizePromptOptions = {}
): Promise<OptimizePromptResponse> {
  const normalized = normalizePrompt(input.prompt);
  const rulePack = getRulePack(input.modelFamily);
  const defaultFormat = rulePack.preferredFormats[0] ?? "markdown";
  const preferredFormat = rulePack.preferredFormats.includes(input.outputFormat)
    ? input.outputFormat
    : defaultFormat;
  const adapter = options.adapter ?? createNoopAdapter(getProviderIdForModelFamily(input.modelFamily));

  try {
    const result = await adapter.optimize({
      prompt: normalized,
      modelFamily: input.modelFamily,
      outputFormat: preferredFormat
    });

    return {
      optimizedPrompt: `[${preferredFormat}] ${result.optimizedPrompt}`,
      score: 50
    };
  } catch (error) {
    throw normalizeProviderError(error, adapter.providerId);
  }
}

function getProviderIdForModelFamily(family: OptimizePromptRequest["modelFamily"]): ProviderId {
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
