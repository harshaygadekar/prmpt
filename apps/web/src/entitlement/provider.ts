import {
  entitlementReadResponseSchema,
  paymentCheckoutStartRequestSchema,
  paymentCheckoutStartResponseSchema,
  polarWebhookEventSchema,
  polarWebhookReconcileResponseSchema,
  type EntitlementReadResponse,
  type PaymentCheckoutStartRequest,
  type PaymentCheckoutStartResponse,
  type PolarWebhookReconcileResponse
} from "@prmpt/contracts";
import {
  InMemoryPaymentEventRepository,
  InMemoryUserBootstrapRepository,
  type PaymentEventRepository,
  type UserBootstrapRepository
} from "@prmpt/data-access";

import {
  PolarApiError,
  createPolarCheckoutGateway,
  resolvePolarEntitlementChange,
  verifyPolarWebhookSignature,
  type PolarCheckoutGateway
} from "../payment/polar.js";

const DEFAULT_ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1_000;

export interface EntitlementProvider {
  getEntitlement(
    userId: string,
    options?: {
      forceRefresh?: boolean;
    }
  ): Promise<EntitlementReadResponse>;
  refreshEntitlement(userId: string): Promise<EntitlementReadResponse>;
  startCheckout(input: PaymentCheckoutStartRequest): Promise<PaymentCheckoutStartResponse>;
  reconcileWebhook(input: {
    rawBody: string;
    headers?: Record<string, string | undefined>;
  }): Promise<PolarWebhookReconcileResponse>;
}

export interface EntitlementCache {
  get(userId: string): EntitlementReadResponse | undefined;
  set(value: EntitlementReadResponse): void;
  clear(userId: string): void;
}

export interface EntitlementCacheOptions {
  ttlMs?: number;
  now?: () => Date;
}

export interface PolarEntitlementProviderConfig {
  webhookSecret?: string | undefined;
  userRepository?: UserBootstrapRepository | undefined;
  paymentEventRepository?: PaymentEventRepository | undefined;
  checkoutGateway?: PolarCheckoutGateway | undefined;
  checkout?:
    | {
        accessToken: string;
        productId: string;
        priceId: string;
        successUrl?: string | undefined;
        cancelUrl?: string | undefined;
        apiBaseUrl?: string | undefined;
      }
    | undefined;
  cache?: EntitlementCache | undefined;
}

export type EntitlementProviderErrorCode =
  | "invalid_request"
  | "invalid_signature"
  | "payments_unavailable"
  | "provider_error";

export class EntitlementProviderError extends Error {
  readonly code: EntitlementProviderErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: EntitlementProviderErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "EntitlementProviderError";
    this.code = code;
    this.status = status;
    this.details = details ?? null;
  }
}

interface CachedEntitlement {
  value: EntitlementReadResponse;
  expiresAtMs: number;
}

class InMemoryEntitlementCache implements EntitlementCache {
  private readonly ttlMs: number;
  private readonly now: () => Date;
  private readonly entries = new Map<string, CachedEntitlement>();

  constructor(options: EntitlementCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_ENTITLEMENT_CACHE_TTL_MS;
    this.now = options.now ?? (() => new Date());
  }

  get(userId: string): EntitlementReadResponse | undefined {
    const entry = this.entries.get(userId);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAtMs <= this.now().getTime()) {
      this.entries.delete(userId);
      return undefined;
    }

    return entry.value;
  }

  set(value: EntitlementReadResponse): void {
    this.entries.set(value.userId, {
      value,
      expiresAtMs: this.now().getTime() + this.ttlMs
    });
  }

  clear(userId: string): void {
    this.entries.delete(userId);
  }
}

export function createInMemoryEntitlementCache(options: EntitlementCacheOptions = {}): EntitlementCache {
  return new InMemoryEntitlementCache(options);
}

export function createPolarEntitlementProvider(
  config: PolarEntitlementProviderConfig = {}
): EntitlementProvider {
  const userRepository = config.userRepository ?? new InMemoryUserBootstrapRepository();
  const paymentEventRepository = config.paymentEventRepository ?? new InMemoryPaymentEventRepository();
  const cache = config.cache ?? createInMemoryEntitlementCache();

  const checkoutGateway =
    config.checkoutGateway ??
    (config.checkout
      ? createPolarCheckoutGateway({
          accessToken: config.checkout.accessToken,
          productId: config.checkout.productId,
          priceId: config.checkout.priceId,
          ...(config.checkout.successUrl != null ? { successUrl: config.checkout.successUrl } : {}),
          ...(config.checkout.cancelUrl != null ? { cancelUrl: config.checkout.cancelUrl } : {}),
          ...(config.checkout.apiBaseUrl != null ? { apiBaseUrl: config.checkout.apiBaseUrl } : {})
        })
      : undefined);

  return {
    async getEntitlement(userId, options = {}) {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) {
        throw new EntitlementProviderError("invalid_request", "userId is required.", 400);
      }

      if (!options.forceRefresh) {
        const cached = cache.get(normalizedUserId);
        if (cached) {
          return cached;
        }
      }

      const state = await userRepository.getUserState(normalizedUserId);
      const resolved = state ?? (await userRepository.upsertUser(normalizedUserId));
      const entitlement = entitlementReadResponseSchema.parse({
        userId: resolved.clerkUserId,
        isPremium: resolved.isPremium,
        source: resolved.isPremium ? "polar" : "trial"
      });

      cache.set(entitlement);
      return entitlement;
    },

    async refreshEntitlement(userId) {
      return this.getEntitlement(userId, { forceRefresh: true });
    },

    async startCheckout(input) {
      if (!checkoutGateway) {
        throw new EntitlementProviderError(
          "payments_unavailable",
          "Polar checkout gateway is not configured.",
          503
        );
      }

      const parsedInput = paymentCheckoutStartRequestSchema.safeParse(input);
      if (!parsedInput.success) {
        throw new EntitlementProviderError("invalid_request", "Checkout request is invalid.", 400, {
          issues: parsedInput.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      try {
        const session = await checkoutGateway.createCheckoutSession({
          userId: parsedInput.data.userId,
          ...(parsedInput.data.userEmail ? { userEmail: parsedInput.data.userEmail } : {}),
          ...(parsedInput.data.successUrl ? { successUrl: parsedInput.data.successUrl } : {}),
          ...(parsedInput.data.cancelUrl ? { cancelUrl: parsedInput.data.cancelUrl } : {})
        });

        return paymentCheckoutStartResponseSchema.parse({
          provider: "polar",
          checkoutUrl: session.checkoutUrl,
          ...(session.checkoutId ? { checkoutId: session.checkoutId } : {})
        });
      } catch (error) {
        if (error instanceof EntitlementProviderError) {
          throw error;
        }

        const message = error instanceof Error ? error.message : "Failed to create checkout session.";
        const status = error instanceof PolarApiError ? error.status : undefined;
        throw new EntitlementProviderError("provider_error", message, status ?? 502);
      }
    },

    async reconcileWebhook(input) {
      const webhookSecret = config.webhookSecret?.trim();
      if (!webhookSecret) {
        throw new EntitlementProviderError(
          "payments_unavailable",
          "POLAR_WEBHOOK_SECRET is not configured.",
          503
        );
      }

      const rawBody = input.rawBody ?? "";
      const signatureValid = await verifyPolarWebhookSignature({
        rawBody,
        webhookSecret,
        headers: normalizeHeaders(input.headers ?? {})
      });
      if (!signatureValid) {
        throw new EntitlementProviderError("invalid_signature", "Invalid Polar webhook signature.", 401);
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        throw new EntitlementProviderError("invalid_request", "Webhook body must be valid JSON.", 400);
      }

      const parsedEvent = polarWebhookEventSchema.safeParse(parsedBody);
      if (!parsedEvent.success) {
        throw new EntitlementProviderError("invalid_request", "Webhook event payload is invalid.", 400, {
          issues: parsedEvent.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      const event = parsedEvent.data;
      const eventUserId = readPolarUserId(event);

      const inserted = await paymentEventRepository.markWebhookEventProcessed({
        provider: "polar",
        eventId: event.id,
        eventType: event.type,
        ...(eventUserId ? { clerkUserId: eventUserId } : {}),
        payload: toRecord(event)
      });
      if (!inserted) {
        return polarWebhookReconcileResponseSchema.parse({
          received: true,
          processed: false,
          duplicate: true
        });
      }

      const entitlementChange = resolvePolarEntitlementChange(event);
      if (!entitlementChange) {
        return polarWebhookReconcileResponseSchema.parse({
          received: true,
          processed: true,
          duplicate: false
        });
      }

      await userRepository.setPremium(entitlementChange.clerkUserId, entitlementChange.isPremium);
      await paymentEventRepository.logEntitlementEvent({
        clerkUserId: entitlementChange.clerkUserId,
        source: "polar",
        eventType: entitlementChange.eventType,
        payload: {
          eventId: event.id,
          isPremium: entitlementChange.isPremium
        }
      });

      const cachedEntitlement = entitlementReadResponseSchema.parse({
        userId: entitlementChange.clerkUserId,
        isPremium: entitlementChange.isPremium,
        source: entitlementChange.isPremium ? "polar" : "trial"
      });
      cache.set(cachedEntitlement);

      return polarWebhookReconcileResponseSchema.parse({
        received: true,
        processed: true,
        duplicate: false,
        userId: entitlementChange.clerkUserId,
        isPremium: entitlementChange.isPremium
      });
    }
  };
}

function normalizeHeaders(headers: Record<string, string | undefined>): Record<string, string | undefined> {
  const output: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    output[key.toLowerCase()] = value;
  }
  return output;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function readPolarUserId(event: {
  data?: Record<string, unknown> | undefined;
}): string | undefined {
  const data = asRecord(event.data);
  const externalCustomerId = data?.external_customer_id;
  if (typeof externalCustomerId === "string" && externalCustomerId.trim().length > 0) {
    return externalCustomerId;
  }

  const customer = asRecord(data?.customer);
  const externalId = customer?.external_id;
  if (typeof externalId === "string" && externalId.trim().length > 0) {
    return externalId;
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
}
