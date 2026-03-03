import {
  paymentCheckoutStartRequestSchema
} from "@prmpt/contracts";

import {
  EntitlementProviderError,
  type EntitlementProvider
} from "../entitlement/provider.js";

export interface PolarCheckoutApiRequest {
  body: unknown;
}

export interface PolarCheckoutApiResponse {
  status: 200 | 400 | 502 | 503;
  body: unknown;
}

export interface PolarCheckoutApiDeps {
  entitlementProvider: EntitlementProvider;
}

export function createPolarCheckoutApi(
  deps: Partial<PolarCheckoutApiDeps> = {}
): (request: PolarCheckoutApiRequest) => Promise<PolarCheckoutApiResponse> {
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

    const parsed = paymentCheckoutStartRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      };
    }

    try {
      const session = await entitlementProvider.startCheckout(parsed.data);
      return {
        status: 200,
        body: session
      };
    } catch (error) {
      if (error instanceof EntitlementProviderError) {
        if (error.code === "payments_unavailable") {
          return {
            status: 503,
            body: {
              error: error.code,
              message: error.message
            }
          };
        }

        if (error.code === "invalid_request") {
          return {
            status: 400,
            body: {
              error: error.code,
              message: error.message,
              ...(error.details ? { details: error.details } : {})
            }
          };
        }
      }

      const message = error instanceof Error ? error.message : "Failed to create checkout session.";
      return {
        status: 502,
        body: {
          error: "provider_error",
          provider: "polar",
          message
        }
      };
    }
  };
}
