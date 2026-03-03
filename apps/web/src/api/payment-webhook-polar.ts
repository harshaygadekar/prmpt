import { polarWebhookReconcileResponseSchema } from "@prmpt/contracts";
import {
  EntitlementProviderError,
  type EntitlementProvider
} from "../entitlement/provider.js";

export interface PolarWebhookApiRequest {
  rawBody: string;
  headers?: Record<string, string | undefined>;
}

export interface PolarWebhookApiResponse {
  status: 200 | 400 | 401 | 503;
  body: unknown;
}

export interface PolarWebhookApiDeps {
  entitlementProvider: EntitlementProvider;
}

export function createPolarWebhookApi(
  deps: Partial<PolarWebhookApiDeps> = {}
): (request: PolarWebhookApiRequest) => Promise<PolarWebhookApiResponse> {
  const entitlementProvider = deps.entitlementProvider;

  return async (request) => {
    if (!entitlementProvider) {
      return {
        status: 503,
        body: {
          error: "payments_unavailable",
          message: "Entitlement provider is not configured."
        }
      };
    }

    try {
      const response = await entitlementProvider.reconcileWebhook({
        rawBody: request.rawBody ?? "",
        ...(request.headers != null ? { headers: request.headers } : {})
      });

      return {
        status: 200,
        body: polarWebhookReconcileResponseSchema.parse(response)
      };
    } catch (error) {
      if (error instanceof EntitlementProviderError) {
        return {
          status: error.status as 400 | 401 | 503,
          body: {
            error: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {})
          }
        };
      }

      return {
        status: 400,
        body: {
          error: "invalid_request",
          message: "Unhandled webhook processing error."
        }
      };
    }
  };
}
