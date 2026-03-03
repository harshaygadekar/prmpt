import type { OptimizePromptRequest, OptimizePromptResponse } from "@prmpt/contracts";
import type { MessageEnvelope } from "../messaging/index.js";
import { createResponse, MESSAGE_TYPES } from "../messaging/index.js";

// --- Optimize flow types ---

export type OptimizeStatus = "idle" | "running" | "success" | "error";

export interface OptimizeFlowState {
  status: OptimizeStatus;
  request: OptimizePromptRequest | undefined;
  response: OptimizePromptResponse | undefined;
  error: OptimizeFlowError | undefined;
}

export interface OptimizeFlowError {
  code: string;
  message: string;
  recoverable: boolean;
  action?: string;
}

// --- Error code mapping ---

export const ERROR_CODES = {
  VALIDATION_ERROR: "validation_error",
  AUTH_REQUIRED: "auth_required",
  ENTITLEMENT_BLOCKED: "entitlement_blocked",
  RATE_LIMITED: "rate_limited",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  PROVIDER_ERROR: "provider_error",
  UNKNOWN_ERROR: "unknown_error"
} as const;

export function mapErrorToFlowError(err: unknown): OptimizeFlowError {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("auth") || msg.includes("sign in") || msg.includes("unauthorized")) {
      return {
        code: ERROR_CODES.AUTH_REQUIRED,
        message: "Please sign in to optimize prompts.",
        recoverable: true,
        action: "sign-in"
      };
    }

    if (msg.includes("rate") && msg.includes("limit")) {
      return {
        code: ERROR_CODES.RATE_LIMITED,
        message: "Too many requests. Please wait a moment and try again.",
        recoverable: true,
        action: "retry"
      };
    }

    if (msg.includes("entitlement") || msg.includes("trial") || msg.includes("limit")) {
      return {
        code: ERROR_CODES.ENTITLEMENT_BLOCKED,
        message: "Usage limit reached. Upgrade to continue optimizing.",
        recoverable: true,
        action: "upgrade"
      };
    }

    if (msg.includes("provider") && (msg.includes("unavailable") || msg.includes("not found"))) {
      return {
        code: ERROR_CODES.PROVIDER_UNAVAILABLE,
        message: "Selected provider is unavailable. Try a different model family.",
        recoverable: true,
        action: "change-provider"
      };
    }

    if (msg.includes("provider") || msg.includes("api")) {
      return {
        code: ERROR_CODES.PROVIDER_ERROR,
        message: `Provider error: ${err.message}`,
        recoverable: true,
        action: "retry"
      };
    }

    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: err.message,
      recoverable: false
    };
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: String(err),
    recoverable: false
  };
}

// --- Optimize orchestrator ---

export interface OptimizeFn {
  (request: OptimizePromptRequest): Promise<OptimizePromptResponse>;
}

export interface ValidateFn {
  (request: unknown): { valid: boolean; request?: OptimizePromptRequest; error?: string };
}

export interface EntitlementCheckFn {
  (): Promise<{ allowed: boolean; reason?: string }>;
}

export interface OptimizeOrchestratorDeps {
  optimize: OptimizeFn;
  validate: ValidateFn;
  checkEntitlement: EntitlementCheckFn;
  onStateChange?: (state: OptimizeFlowState) => void;
}

export class OptimizeOrchestrator {
  private state: OptimizeFlowState = {
    status: "idle",
    request: undefined,
    response: undefined,
    error: undefined
  };

  private deps: OptimizeOrchestratorDeps;

  constructor(deps: OptimizeOrchestratorDeps) {
    this.deps = deps;
  }

  getState(): OptimizeFlowState {
    return { ...this.state };
  }

  private setState(partial: Partial<OptimizeFlowState>): void {
    this.state = { ...this.state, ...partial };
    this.deps.onStateChange?.({ ...this.state });
  }

  async run(rawRequest: unknown): Promise<OptimizeFlowState> {
    // Validate request
    const validation = this.deps.validate(rawRequest);
    if (!validation.valid || !validation.request) {
      const errorState: OptimizeFlowState = {
        status: "error",
        request: undefined,
        response: undefined,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: validation.error ?? "Invalid request",
          recoverable: true,
          action: "fix-input"
        }
      };
      this.setState(errorState);
      return this.getState();
    }

    const request = validation.request;

    // Check entitlement
    try {
      const entitlement = await this.deps.checkEntitlement();
      if (!entitlement.allowed) {
        const errorState: OptimizeFlowState = {
          status: "error",
          request,
          response: undefined,
          error: {
            code: ERROR_CODES.ENTITLEMENT_BLOCKED,
            message: entitlement.reason ?? "Usage limit reached.",
            recoverable: true,
            action: "upgrade"
          }
        };
        this.setState(errorState);
        return this.getState();
      }
    } catch (err) {
      const errorState: OptimizeFlowState = {
        status: "error",
        request,
        response: undefined,
        error: mapErrorToFlowError(err)
      };
      this.setState(errorState);
      return this.getState();
    }

    // Run optimization
    this.setState({ status: "running", request, response: undefined, error: undefined });

    try {
      const response = await this.deps.optimize(request);
      this.setState({ status: "success", response, error: undefined });
      return this.getState();
    } catch (err) {
      this.setState({
        status: "error",
        response: undefined,
        error: mapErrorToFlowError(err)
      });
      return this.getState();
    }
  }

  reset(): void {
    this.setState({
      status: "idle",
      request: undefined,
      response: undefined,
      error: undefined
    });
  }
}

// --- Message handler factory for optimize flow ---

export function createOptimizeHandler(
  orchestrator: OptimizeOrchestrator
): (envelope: MessageEnvelope) => Promise<MessageEnvelope> {
  return async (envelope: MessageEnvelope): Promise<MessageEnvelope> => {
    const result = await orchestrator.run(envelope.payload);

    if (result.status === "error") {
      return createResponse(
        MESSAGE_TYPES.OPTIMIZE_RESPONSE,
        {
          success: false,
          error: result.error
        },
        envelope.correlationId
      );
    }

    return createResponse(
      MESSAGE_TYPES.OPTIMIZE_RESPONSE,
      {
        success: true,
        optimizedPrompt: result.response?.optimizedPrompt,
        score: result.response?.score,
        scoreDetails: result.response?.scoreDetails,
        metadata: result.response?.metadata
      },
      envelope.correlationId
    );
  };
}
