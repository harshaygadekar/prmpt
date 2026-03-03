export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function createCorrelationId(seed = Date.now()): string {
  return `corr_${seed.toString(36)}`;
}

export * from "./env.js";
export * from "./redaction.js";
