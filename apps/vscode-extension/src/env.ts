import { getRuntimeEnv, readEnvVar, validateEnv } from "@prmpt/shared-utils";

const EXTENSION_REQUIRED_ENV = [
  "APP_BASE_URL",
  "VSCODE_CALLBACK_URI",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
] as const;

const BYOK_REQUIRED_ENV_GROUPS = [
  ["OPENAI_API_KEY"],
  ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY"]
] as const;

export interface ExtensionEnv {
  appBaseUrl: string;
  vscodeCallbackUri: string;
  clerkPublishableKey: string;
  providerKeys: {
    openaiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
    geminiApiKey: string | undefined;
    openrouterApiKey: string | undefined;
    groqApiKey: string | undefined;
  };
}

export interface ExtensionEnvOptions {
  requireByok?: boolean;
}

export function loadExtensionEnv(
  rawEnv = getRuntimeEnv(),
  options: ExtensionEnvOptions = {}
): ExtensionEnv {
  validateEnv("apps/vscode-extension", rawEnv, {
    required: [...EXTENSION_REQUIRED_ENV],
    atLeastOneOf: options.requireByok ? BYOK_REQUIRED_ENV_GROUPS.map((group) => [...group]) : []
  });

  return {
    appBaseUrl: readEnvVar(rawEnv, "APP_BASE_URL") as string,
    vscodeCallbackUri: readEnvVar(rawEnv, "VSCODE_CALLBACK_URI") as string,
    clerkPublishableKey: readEnvVar(rawEnv, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") as string,
    providerKeys: {
      openaiApiKey: readEnvVar(rawEnv, "OPENAI_API_KEY"),
      anthropicApiKey: readEnvVar(rawEnv, "ANTHROPIC_API_KEY"),
      geminiApiKey: readEnvVar(rawEnv, "GEMINI_API_KEY"),
      openrouterApiKey: readEnvVar(rawEnv, "OPENROUTER_API_KEY"),
      groqApiKey: readEnvVar(rawEnv, "GROQ_API_KEY")
    }
  };
}
