export type ModelFamily = "claude" | "gpt" | "gemini" | "local";
export type OutputFormat = "xml" | "json" | "markdown" | "text";

// --- Technique Registry (ST-10-01) ---

export type TechniqueId =
  | "xml-tagging"
  | "role-priming"
  | "step-decomposition"
  | "output-constraints"
  | "few-shot-priming"
  | "chain-of-thought"
  | "simplification";

export type TechniqueCategory = "structure" | "reasoning" | "context" | "output";

export interface TechniqueDescriptor {
  id: TechniqueId;
  label: string;
  description: string;
  category: TechniqueCategory;
  /** Families this technique works well with */
  compatibleFamilies: ModelFamily[];
  /** Techniques that must not be combined with this one */
  conflictsWith: TechniqueId[];
  /** Application priority (lower = applied first) */
  order: number;
}

const TECHNIQUE_REGISTRY: Record<TechniqueId, TechniqueDescriptor> = {
  "xml-tagging": {
    id: "xml-tagging",
    label: "XML Tagging",
    description: "Wraps prompt sections in XML tags for semantic clarity. Best for Claude.",
    category: "structure",
    compatibleFamilies: ["claude", "gpt", "gemini"],
    conflictsWith: [],
    order: 10
  },
  "role-priming": {
    id: "role-priming",
    label: "Role Priming",
    description: "Prepends an expert persona definition to set behavioral context.",
    category: "context",
    compatibleFamilies: ["claude", "gpt", "gemini", "local"],
    conflictsWith: [],
    order: 5
  },
  "step-decomposition": {
    id: "step-decomposition",
    label: "Step Decomposition",
    description: "Breaks complex instructions into numbered steps for sequential processing.",
    category: "reasoning",
    compatibleFamilies: ["claude", "gpt", "gemini"],
    conflictsWith: ["simplification"],
    order: 20
  },
  "output-constraints": {
    id: "output-constraints",
    label: "Output Constraints",
    description: "Defines explicit format, length, and content boundaries for the response.",
    category: "output",
    compatibleFamilies: ["claude", "gpt", "gemini", "local"],
    conflictsWith: [],
    order: 30
  },
  "few-shot-priming": {
    id: "few-shot-priming",
    label: "Few-Shot Priming",
    description: "Includes input/output examples to demonstrate desired behavior pattern.",
    category: "context",
    compatibleFamilies: ["gpt", "claude", "gemini"],
    conflictsWith: ["simplification"],
    order: 15
  },
  "chain-of-thought": {
    id: "chain-of-thought",
    label: "Chain of Thought",
    description: "Instructs model to show reasoning steps before producing final answer.",
    category: "reasoning",
    compatibleFamilies: ["gpt", "gemini", "claude"],
    conflictsWith: ["simplification"],
    order: 25
  },
  "simplification": {
    id: "simplification",
    label: "Simplification",
    description: "Reduces prompt complexity for smaller or resource-constrained models.",
    category: "structure",
    compatibleFamilies: ["local", "gemini"],
    conflictsWith: ["step-decomposition", "few-shot-priming", "chain-of-thought"],
    order: 5
  }
};

export function getTechnique(id: TechniqueId): TechniqueDescriptor {
  const technique = TECHNIQUE_REGISTRY[id];
  if (!technique) {
    throw new Error(`Unknown technique: ${id}`);
  }
  return technique;
}

export function listTechniques(): TechniqueDescriptor[] {
  return Object.values(TECHNIQUE_REGISTRY);
}

export function listTechniqueIds(): TechniqueId[] {
  return Object.keys(TECHNIQUE_REGISTRY) as TechniqueId[];
}

export function isTechniqueId(value: string): value is TechniqueId {
  return value in TECHNIQUE_REGISTRY;
}

/**
 * Returns techniques compatible with the given model family,
 * sorted by application order (ascending).
 */
export function getCompatibleTechniques(family: ModelFamily): TechniqueDescriptor[] {
  return Object.values(TECHNIQUE_REGISTRY)
    .filter((t) => t.compatibleFamilies.includes(family))
    .sort((a, b) => a.order - b.order);
}

/**
 * Validates a user-selected technique set against a model family.
 * Returns { valid, resolved, conflicts, warnings }.
 */
export interface TechniqueValidationResult {
  valid: boolean;
  /** Resolved techniques in application order */
  resolved: TechniqueId[];
  /** Pairs of conflicting techniques */
  conflicts: Array<[TechniqueId, TechniqueId]>;
  /** Human-readable warnings */
  warnings: string[];
}

export function validateTechniqueSelection(
  selected: TechniqueId[],
  family: ModelFamily
): TechniqueValidationResult {
  const warnings: string[] = [];
  const conflicts: Array<[TechniqueId, TechniqueId]> = [];
  const compatible = getCompatibleTechniques(family);
  const compatibleIds = new Set(compatible.map((t) => t.id));

  // Deduplicate preserving order
  const unique = [...new Set(selected)];

  // Check compatibility
  for (const id of unique) {
    if (!compatibleIds.has(id)) {
      warnings.push(`Technique "${id}" is not compatible with model family "${family}".`);
    }
  }

  // Check conflicts
  for (const idA of unique) {
    const a = TECHNIQUE_REGISTRY[idA];
    for (const idB of unique) {
      if (idA === idB) continue;
      if (a.conflictsWith.includes(idB)) {
        // Only add once (ordered pair avoids duplicates)
        if (idA < idB && !conflicts.some(([x, y]) => x === idA && y === idB)) {
          conflicts.push([idA, idB]);
          warnings.push(`Techniques "${idA}" and "${idB}" conflict with each other.`);
        }
      }
    }
  }

  // Sort by application order (deterministic)
  const resolved = [...unique].sort((a, b) => {
    return TECHNIQUE_REGISTRY[a].order - TECHNIQUE_REGISTRY[b].order;
  });

  return {
    valid: conflicts.length === 0 && warnings.length === 0,
    resolved,
    conflicts,
    warnings
  };
}

// --- Rule Pack types ---

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
  techniques: TechniqueId[];
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
