import {
  entitlementReadRequestSchema,
  entitlementReadResponseSchema
} from "@prmpt/contracts";

import {
  EntitlementProviderError,
  type EntitlementProvider
} from "../entitlement/provider.js";

export interface EntitlementReadApiRequest {
  query: Record<string, string | undefined>;
}

export interface EntitlementReadApiResponse {
  status: 200 | 400 | 503;
  body: unknown;
}

export interface EntitlementReadApiDeps {
  entitlementProvider: EntitlementProvider;
}

export function createEntitlementReadApi(
  deps: Partial<EntitlementReadApiDeps> = {}
): (request: EntitlementReadApiRequest) => Promise<EntitlementReadApiResponse> {
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

    const parsed = entitlementReadRequestSchema.safeParse({
      userId: request.query.userId
    });
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

    const forceRefresh = request.query.refresh === "true";

    try {
      const response = await entitlementProvider.getEntitlement(parsed.data.userId, {
        forceRefresh
      });
      return {
        status: 200,
        body: entitlementReadResponseSchema.parse(response)
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

        return {
          status: 400,
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
          message: "Unhandled entitlement read error."
        }
      };
    }
  };
}
