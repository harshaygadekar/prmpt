import {
  listTechniques,
  getCompatibleTechniques,
  validateTechniqueSelection,
  type TechniqueId,
  type ModelFamily,
  type TechniqueDescriptor,
  type TechniqueValidationResult
} from "@prmpt/model-rules";
import type { MessageEnvelope } from "../messaging/index.js";
import { createResponse, MESSAGE_TYPES } from "../messaging/index.js";

// --- Technique list handler ---

export interface TechniqueListPayload {
  modelFamily?: ModelFamily;
}

export interface TechniqueListResponse {
  techniques: TechniqueDescriptor[];
}

export function createTechniqueListHandler(): (
  envelope: MessageEnvelope
) => MessageEnvelope {
  return (envelope: MessageEnvelope): MessageEnvelope => {
    const payload = envelope.payload as TechniqueListPayload | undefined;
    const family = payload?.modelFamily;

    const techniques = family
      ? getCompatibleTechniques(family)
      : listTechniques();

    return createResponse(
      MESSAGE_TYPES.TECHNIQUE_LIST_RESPONSE,
      { techniques } satisfies TechniqueListResponse,
      envelope.correlationId
    );
  };
}

// --- Technique validate handler ---

export interface TechniqueValidatePayload {
  techniques: TechniqueId[];
  modelFamily: ModelFamily;
}

export function createTechniqueValidateHandler(): (
  envelope: MessageEnvelope
) => MessageEnvelope {
  return (envelope: MessageEnvelope): MessageEnvelope => {
    const payload = envelope.payload as TechniqueValidatePayload;

    if (
      !payload ||
      !Array.isArray(payload.techniques) ||
      typeof payload.modelFamily !== "string"
    ) {
      return createResponse(
        MESSAGE_TYPES.TECHNIQUE_VALIDATE_RESPONSE,
        {
          valid: false,
          resolved: [],
          conflicts: [],
          warnings: ["Invalid validate request: techniques and modelFamily required."]
        } satisfies TechniqueValidationResult,
        envelope.correlationId
      );
    }

    const result = validateTechniqueSelection(
      payload.techniques,
      payload.modelFamily as ModelFamily
    );

    return createResponse(
      MESSAGE_TYPES.TECHNIQUE_VALIDATE_RESPONSE,
      result,
      envelope.correlationId
    );
  };
}
