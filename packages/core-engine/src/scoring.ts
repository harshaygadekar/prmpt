import type { ModelFamily, OutputFormat, RulePack } from "@prmpt/model-rules";

// --- Score types ---

export type ReasonCode =
  | "missing_constraints"
  | "ambiguous_objective"
  | "missing_output_contract"
  | "model_family_mismatch"
  | "overuse_of_techniques"
  | "insufficient_context"
  | "structure_inconsistency";

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  weighted: number;
  reasons: ReasonCode[];
}

export interface ScoreResult {
  total: number;
  label: "poor" | "fair" | "good" | "very_good" | "excellent";
  dimensions: DimensionScore[];
  reasons: ReasonCode[];
}

export interface ScoreInput {
  prompt: string;
  modelFamily: ModelFamily;
  outputFormat: OutputFormat;
  rulePack: RulePack;
}

// --- Dimension weights (from rubric v1) ---

const WEIGHTS = {
  completeness: 0.30,
  clarity: 0.25,
  structure: 0.20,
  modelFit: 0.15,
  techniqueUsage: 0.10
} as const;

// --- Heuristic scorers (deterministic, no randomness) ---

function scoreCompleteness(prompt: string): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  let score = 40; // baseline for a non-empty prompt

  const lower = prompt.toLowerCase();
  const len = prompt.length;

  // goal presence
  if (/\b(goal|objective|task|purpose|deliver|produce|return)\b/i.test(prompt)) {
    score += 12;
  } else {
    reasons.push("ambiguous_objective");
  }

  // context signals
  if (/\b(context|background|given|scenario|situation)\b/i.test(prompt)) {
    score += 10;
  } else if (len > 150) {
    score += 5; // longer prompts likely have implicit context
  } else {
    reasons.push("insufficient_context");
  }

  // constraint signals
  if (/\b(constraint|must not|do not|limit|avoid|boundary|require)\b/i.test(prompt)) {
    score += 10;
  } else {
    reasons.push("missing_constraints");
  }

  // output contract signals
  if (/\b(output|format|return|respond|deliver|produce)\b/i.test(prompt) && /\b(json|xml|markdown|list|table|structured)\b/i.test(lower)) {
    score += 12;
  } else if (/\b(output|format|return|respond)\b/i.test(prompt)) {
    score += 6;
  } else {
    reasons.push("missing_output_contract");
  }

  // edge case coverage
  if (/\b(edge case|exception|error|fallback|unknown|empty)\b/i.test(prompt)) {
    score += 6;
  }

  return { score: clamp(score), reasons };
}

function scoreClarity(prompt: string): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  let score = 45;

  // imperative language
  const imperativeCount = (prompt.match(/\b(generate|create|list|explain|analyze|write|return|provide|describe|implement|summarize|evaluate|compare|identify)\b/gi) ?? []).length;
  if (imperativeCount >= 3) {
    score += 15;
  } else if (imperativeCount >= 1) {
    score += 8;
  }

  // numbered or bulleted steps indicate clarity
  const stepPatterns = (prompt.match(/(?:^|\n)\s*(?:\d+[.)]\s|[-*]\s)/gm) ?? []).length;
  if (stepPatterns >= 3) {
    score += 15;
  } else if (stepPatterns >= 1) {
    score += 8;
  }

  // vague language penalty
  const vagueCount = (prompt.match(/\b(maybe|perhaps|possibly|might|could be|it depends|some|things?|stuff)\b/gi) ?? []).length;
  if (vagueCount >= 3) {
    score -= 15;
    reasons.push("ambiguous_objective");
  } else if (vagueCount >= 1) {
    score -= 5;
  }

  // sentence length clarity — very long sentences reduce clarity
  const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgWords = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentences.length;
    if (avgWords <= 20) {
      score += 10;
    } else if (avgWords > 40) {
      score -= 10;
    }
  }

  return { score: clamp(score), reasons };
}

function scoreStructure(prompt: string): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  let score = 35;

  // check for section markers
  const sectionMarkers = (prompt.match(/(?:^|\n)\s*(?:#{1,3}\s|[A-Z][a-z]+:\s|\*\*[^*]+\*\*)/gm) ?? []).length;
  if (sectionMarkers >= 3) {
    score += 20;
  } else if (sectionMarkers >= 1) {
    score += 10;
  } else {
    reasons.push("structure_inconsistency");
  }

  // numbered lists
  const numberedSteps = (prompt.match(/(?:^|\n)\s*\d+[.)]\s/gm) ?? []).length;
  if (numberedSteps >= 2) {
    score += 15;
  }

  // bullet points
  const bullets = (prompt.match(/(?:^|\n)\s*[-*]\s/gm) ?? []).length;
  if (bullets >= 2) {
    score += 10;
  }

  // XML tags (good for Claude especially)
  const xmlTags = (prompt.match(/<[a-z][a-z0-9_-]*>/gi) ?? []).length;
  if (xmlTags >= 2) {
    score += 10;
  }

  // line count — multi-line structure is better
  const lineCount = prompt.split("\n").length;
  if (lineCount >= 5) {
    score += 5;
  }

  return { score: clamp(score), reasons };
}

function scoreModelFit(prompt: string, rulePack: RulePack, outputFormat: OutputFormat): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  let score = 50;

  // format fit
  if (rulePack.preferredFormats.includes(outputFormat)) {
    score += 15;
  } else if (rulePack.constraints.supportedFormats.includes(outputFormat)) {
    score += 5;
  } else {
    score -= 10;
    reasons.push("model_family_mismatch");
  }

  // technique alignment heuristics per family
  const family = rulePack.family;

  if (family === "claude") {
    // Claude favors XML tags
    const xmlPresence = /<[a-z][a-z0-9_-]*>/i.test(prompt);
    if (xmlPresence) score += 15;
    // Claude favors role priming
    if (/\b(you are|act as|role)\b/i.test(prompt)) score += 10;
  } else if (family === "gpt") {
    // GPT favors structured output + few-shot
    if (/\b(example|for instance|e\.g\.)\b/i.test(prompt)) score += 15;
    if (/\b(step[- ]?by[- ]?step|chain[- ]?of[- ]?thought)\b/i.test(prompt)) score += 10;
  } else if (family === "gemini") {
    // Gemini favors clear reasoning instructions
    if (/\b(reason|think|explain|step[- ]?by[- ]?step)\b/i.test(prompt)) score += 15;
    if (/\b(clear|explicit)\b/i.test(prompt)) score += 5;
  } else if (family === "local") {
    // Local models favor conciseness
    if (prompt.length < 500) score += 15;
    else if (prompt.length < 1000) score += 5;
    else score -= 10;
    // Direct instructions
    if (/\b(be concise|be direct|short)\b/i.test(prompt)) score += 10;
  }

  return { score: clamp(score), reasons };
}

function scoreTechniqueUsage(prompt: string, rulePack: RulePack): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  let score = 40;

  const techniques = rulePack.techniques;
  let matchCount = 0;

  for (const tech of techniques) {
    switch (tech) {
      case "xml-tagging":
        if (/<[a-z][a-z0-9_-]*>/i.test(prompt)) matchCount++;
        break;
      case "role-priming":
      case "explicit_role":
        if (/\b(you are|act as|role|expert|specialist)\b/i.test(prompt)) matchCount++;
        break;
      case "step-decomposition":
      case "step_decomposition":
        if (/\b(step[- ]?\d|first|second|third|then|next|finally)\b/i.test(prompt)) matchCount++;
        break;
      case "output-constraints":
      case "constraints_block":
      case "ordered_requirements":
        if (/\b(constraint|must|require|format|output)\b/i.test(prompt)) matchCount++;
        break;
      case "few-shot-priming":
        if (/\b(example|for instance|e\.g\.|sample)\b/i.test(prompt)) matchCount++;
        break;
      case "chain-of-thought":
        if (/\b(chain[- ]?of[- ]?thought|step[- ]?by[- ]?step|reason|think through)\b/i.test(prompt)) matchCount++;
        break;
      case "simplification":
        if (/\b(simple|concise|direct|brief|short)\b/i.test(prompt)) matchCount++;
        break;
    }
  }

  const ratio = techniques.length > 0 ? matchCount / techniques.length : 0;

  if (ratio >= 0.75) {
    score += 40;
  } else if (ratio >= 0.5) {
    score += 25;
  } else if (ratio >= 0.25) {
    score += 10;
  }

  // overuse penalty: very long prompts stuffed with techniques
  if (matchCount > techniques.length * 2) {
    score -= 15;
    reasons.push("overuse_of_techniques");
  }

  if (matchCount === 0 && techniques.length > 0) {
    score -= 10;
  }

  return { score: clamp(score), reasons };
}

// --- Main scorer ---

export function scorePrompt(input: ScoreInput): ScoreResult {
  const completeness = scoreCompleteness(input.prompt);
  const clarity = scoreClarity(input.prompt);
  const structure = scoreStructure(input.prompt);
  const modelFit = scoreModelFit(input.prompt, input.rulePack, input.outputFormat);
  const techniqueUsage = scoreTechniqueUsage(input.prompt, input.rulePack);

  const dimensions: DimensionScore[] = [
    {
      dimension: "completeness",
      score: completeness.score,
      weight: WEIGHTS.completeness,
      weighted: Math.round(completeness.score * WEIGHTS.completeness * 100) / 100,
      reasons: completeness.reasons
    },
    {
      dimension: "clarity",
      score: clarity.score,
      weight: WEIGHTS.clarity,
      weighted: Math.round(clarity.score * WEIGHTS.clarity * 100) / 100,
      reasons: clarity.reasons
    },
    {
      dimension: "structure",
      score: structure.score,
      weight: WEIGHTS.structure,
      weighted: Math.round(structure.score * WEIGHTS.structure * 100) / 100,
      reasons: structure.reasons
    },
    {
      dimension: "modelFit",
      score: modelFit.score,
      weight: WEIGHTS.modelFit,
      weighted: Math.round(modelFit.score * WEIGHTS.modelFit * 100) / 100,
      reasons: modelFit.reasons
    },
    {
      dimension: "techniqueUsage",
      score: techniqueUsage.score,
      weight: WEIGHTS.techniqueUsage,
      weighted: Math.round(techniqueUsage.score * WEIGHTS.techniqueUsage * 100) / 100,
      reasons: techniqueUsage.reasons
    }
  ];

  const total = Math.round(dimensions.reduce((acc, d) => acc + d.weighted, 0));
  const allReasons = [...new Set(dimensions.flatMap((d) => d.reasons))];
  const label = getScoreLabel(total);

  return { total, label, dimensions, reasons: allReasons };
}

function getScoreLabel(total: number): ScoreResult["label"] {
  if (total >= 90) return "excellent";
  if (total >= 80) return "very_good";
  if (total >= 60) return "good";
  if (total >= 40) return "fair";
  return "poor";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
