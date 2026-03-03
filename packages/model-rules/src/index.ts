export type ModelFamily = "claude" | "gpt" | "gemini" | "local";
export type OutputFormat = "xml" | "json" | "markdown" | "text";

export interface RulePackConstraints {
  maxTokens: number;
  temperature: { min: number; max: number; default: number };
  supportedFormats: OutputFormat[];
}

export interface RulePack {
  family: ModelFamily;
  version: string;
  preferredFormats: OutputFormat[];
  systemPromptTemplate: string;
  techniques: string[];
  constraints: RulePackConstraints;
}

const RULE_PACK_VERSION = "1.0.0";

const RULE_PACKS: Record<ModelFamily, RulePack> = {
  claude: {
    family: "claude",
    version: RULE_PACK_VERSION,
    preferredFormats: ["xml", "markdown"],
    systemPromptTemplate:
      "You are an expert prompt engineer. Rewrite the following prompt to be clearer, more specific, and optimized for Claude models. Use XML tags for structure when beneficial.",
    techniques: ["xml-tagging", "role-priming", "step-decomposition", "output-constraints"],
    constraints: {
      maxTokens: 4096,
      temperature: { min: 0, max: 1, default: 0.3 },
      supportedFormats: ["xml", "markdown", "text"]
    }
  },
  gpt: {
    family: "gpt",
    version: RULE_PACK_VERSION,
    preferredFormats: ["markdown", "json"],
    systemPromptTemplate:
      "You are an expert prompt engineer. Rewrite the following prompt to be clearer, more specific, and optimized for GPT models. Use structured formatting and explicit instructions.",
    techniques: ["few-shot-priming", "chain-of-thought", "output-constraints", "role-priming"],
    constraints: {
      maxTokens: 4096,
      temperature: { min: 0, max: 2, default: 0.4 },
      supportedFormats: ["markdown", "json", "text"]
    }
  },
  gemini: {
    family: "gemini",
    version: RULE_PACK_VERSION,
    preferredFormats: ["markdown", "text"],
    systemPromptTemplate:
      "You are an expert prompt engineer. Rewrite the following prompt to be clearer, more specific, and optimized for Gemini models. Use clear structure and explicit reasoning instructions.",
    techniques: ["chain-of-thought", "step-decomposition", "output-constraints"],
    constraints: {
      maxTokens: 4096,
      temperature: { min: 0, max: 2, default: 0.4 },
      supportedFormats: ["markdown", "json", "text"]
    }
  },
  local: {
    family: "local",
    version: RULE_PACK_VERSION,
    preferredFormats: ["markdown", "text"],
    systemPromptTemplate:
      "You are an expert prompt engineer. Rewrite the following prompt to be clearer and more concise. Optimize for smaller language models by being direct and explicit.",
    techniques: ["simplification", "output-constraints", "role-priming"],
    constraints: {
      maxTokens: 2048,
      temperature: { min: 0, max: 2, default: 0.3 },
      supportedFormats: ["markdown", "text"]
    }
  }
};

export function getRulePack(family: ModelFamily): RulePack {
  const pack = RULE_PACKS[family];
  if (!pack) {
    throw new Error(`Unknown model family: ${family}`);
  }
  return pack;
}

export function validateRulePack(pack: unknown): pack is RulePack {
  if (typeof pack !== "object" || pack === null) return false;
  const p = pack as Record<string, unknown>;
  return (
    typeof p.family === "string" &&
    typeof p.version === "string" &&
    Array.isArray(p.preferredFormats) &&
    typeof p.systemPromptTemplate === "string" &&
    Array.isArray(p.techniques) &&
    typeof p.constraints === "object" &&
    p.constraints !== null
  );
}

export function listModelFamilies(): ModelFamily[] {
  return Object.keys(RULE_PACKS) as ModelFamily[];
}

export function getRulePackVersion(family: ModelFamily): string {
  return getRulePack(family).version;
}
