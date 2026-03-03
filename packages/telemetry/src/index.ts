import { createCorrelationId } from "@prmpt/shared-utils";

export interface TelemetryEvent {
  name: string;
  ts: string;
  correlationId: string;
}

export function createTelemetryEvent(name: string, now = new Date()): TelemetryEvent {
  return {
    name,
    ts: now.toISOString(),
    correlationId: createCorrelationId(now.getTime())
  };
}
