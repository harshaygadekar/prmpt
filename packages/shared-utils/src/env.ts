export type EnvMap = Record<string, string | undefined>;

export interface EnvValidationPlan {
  required?: string[];
  atLeastOneOf?: string[][];
}

export interface EnvValidationIssue {
  key: string;
  message: string;
}

export class EnvValidationError extends Error {
  readonly scope: string;
  readonly issues: EnvValidationIssue[];

  constructor(scope: string, issues: EnvValidationIssue[]) {
    super(
      `[${scope}] Environment validation failed: ${issues
        .map((issue) => `${issue.key} ${issue.message}`)
        .join("; ")}`
    );
    this.name = "EnvValidationError";
    this.scope = scope;
    this.issues = issues;
  }
}

export function getRuntimeEnv(): EnvMap {
  const runtime = globalThis as { process?: { env?: EnvMap } };
  return runtime.process?.env ?? {};
}

export function readEnvVar(env: EnvMap, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateEnv(scope: string, env: EnvMap, plan: EnvValidationPlan): void {
  const issues: EnvValidationIssue[] = [];

  for (const key of plan.required ?? []) {
    if (!readEnvVar(env, key)) {
      issues.push({ key, message: "is required" });
    }
  }

  for (const keys of plan.atLeastOneOf ?? []) {
    const hasAny = keys.some((key) => Boolean(readEnvVar(env, key)));
    if (!hasAny) {
      issues.push({
        key: keys.join(" | "),
        message: "requires at least one non-empty value"
      });
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError(scope, issues);
  }
}
