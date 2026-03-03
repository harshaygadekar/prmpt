export type ModelFamily = "claude" | "gpt" | "gemini" | "local";

export interface RulePack {
  family: ModelFamily;
  preferredFormats: Array<"xml" | "json" | "markdown" | "text">;
}

const RULE_PACKS: Record<ModelFamily, RulePack> = {
  claude: { family: "claude", preferredFormats: ["xml", "markdown"] },
  gpt: { family: "gpt", preferredFormats: ["markdown", "json"] },
  gemini: { family: "gemini", preferredFormats: ["markdown", "text"] },
  local: { family: "local", preferredFormats: ["markdown", "text"] }
};

export function getRulePack(family: ModelFamily): RulePack {
  return RULE_PACKS[family];
}
