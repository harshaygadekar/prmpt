import type { PolarWebhookEvent } from "@prmpt/contracts";

const DEFAULT_POLAR_API_BASE_URL = "https://api.polar.sh";

export interface PolarCheckoutSessionInput {
  userId: string;
  userEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PolarCheckoutSession {
  checkoutUrl: string;
  checkoutId?: string;
}

export interface PolarCheckoutGateway {
  createCheckoutSession(input: PolarCheckoutSessionInput): Promise<PolarCheckoutSession>;
}

export interface PolarCheckoutGatewayConfig {
  accessToken: string;
  productId: string;
  priceId: string;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
  apiBaseUrl?: string | undefined;
  fetchFn?: typeof fetch | undefined;
}

export interface PolarEntitlementChange {
  clerkUserId: string;
  isPremium: boolean;
  eventType: string;
}

export class PolarApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PolarApiError";
    this.status = status;
  }
}

export function createPolarCheckoutGateway(config: PolarCheckoutGatewayConfig): PolarCheckoutGateway {
  const accessToken = config.accessToken.trim();
  const productId = config.productId.trim();
  const priceId = config.priceId.trim();

  if (!accessToken) {
    throw new PolarApiError("POLAR_ACCESS_TOKEN is required.");
  }
  if (!productId) {
    throw new PolarApiError("POLAR_PRODUCT_ID is required.");
  }
  if (!priceId) {
    throw new PolarApiError("POLAR_PRICE_ID is required.");
  }

  const fetchFn = config.fetchFn ?? fetch;
  const apiBaseUrl = sanitizeBaseUrl(config.apiBaseUrl ?? DEFAULT_POLAR_API_BASE_URL);

  return {
    async createCheckoutSession(input) {
      const body: Record<string, unknown> = {
        product_id: productId,
        price_id: priceId,
        external_customer_id: input.userId,
        success_url: input.successUrl ?? config.successUrl,
        cancel_url: input.cancelUrl ?? config.cancelUrl,
        metadata: {
          clerk_user_id: input.userId
        }
      };

      if (input.userEmail) {
        body.customer_email = input.userEmail;
      }

      const response = await fetchFn(`${apiBaseUrl}/v1/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new PolarApiError(
          `Polar checkout creation failed status=${response.status} body=${raw}`,
          response.status
        );
      }

      let parsed: unknown = {};
      if (raw.trim().length > 0) {
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          throw new PolarApiError("Polar checkout response was not valid JSON.", response.status);
        }
      }

      const payload = asRecord(parsed);
      const checkoutUrl = readString(payload, "url") ?? readString(payload, "checkout_url");
      const checkoutId = readString(payload, "id");

      if (!checkoutUrl) {
        throw new PolarApiError("Polar checkout response did not include a checkout URL.", response.status);
      }

      return {
        checkoutUrl,
        ...(checkoutId ? { checkoutId } : {})
      };
    }
  };
}

export async function verifyPolarWebhookSignature(input: {
  rawBody: string;
  webhookSecret: string;
  headers: Record<string, string | undefined>;
}): Promise<boolean> {
  const secret = input.webhookSecret.trim();
  if (!secret) {
    return false;
  }

  const headerValue =
    input.headers["x-polar-signature"] ??
    input.headers["polar-signature"] ??
    input.headers["svix-signature"];
  if (!headerValue) {
    return false;
  }

  const timestamp = input.headers["svix-timestamp"];
  const payloadCandidates = [input.rawBody];
  if (timestamp) {
    payloadCandidates.push(`${timestamp}.${input.rawBody}`);
  }

  const signatures = parseSignatureCandidates(headerValue);
  if (signatures.length === 0) {
    return false;
  }

  for (const payload of payloadCandidates) {
    const digest = await hmacDigest(secret, payload);
    const expectedHex = toHex(digest);
    const expectedBase64 = toBase64(digest);

    for (const signature of signatures) {
      if (secureCompare(signature, expectedHex) || secureCompare(signature, expectedBase64)) {
        return true;
      }
    }
  }

  return false;
}

export function resolvePolarEntitlementChange(event: PolarWebhookEvent): PolarEntitlementChange | undefined {
  const eventType = event.type;
  const normalized = eventType.toLowerCase();

  const grantEvent =
    normalized.includes("order.paid") ||
    normalized.includes("checkout.completed") ||
    normalized.includes("subscription.active") ||
    normalized.includes("benefit.granted") ||
    normalized.includes("entitlement.granted");
  const revokeEvent =
    normalized.includes("subscription.canceled") ||
    normalized.includes("subscription.revoked") ||
    normalized.includes("subscription.expired") ||
    normalized.includes("benefit.revoked") ||
    normalized.includes("entitlement.revoked") ||
    normalized.includes("order.refunded");

  if (!grantEvent && !revokeEvent) {
    return undefined;
  }

  const clerkUserId = extractClerkUserId(event);
  if (!clerkUserId) {
    return undefined;
  }

  return {
    clerkUserId,
    isPremium: grantEvent,
    eventType
  };
}

function extractClerkUserId(event: PolarWebhookEvent): string | undefined {
  const data = asRecord(event.data);
  const metadata = asRecord(event.metadata);
  const dataMetadata = asRecord(data?.metadata);
  const customer = asRecord(data?.customer);

  const candidates = [
    readString(data, "external_customer_id"),
    readString(customer, "external_id"),
    readString(dataMetadata, "clerk_user_id"),
    readString(dataMetadata, "clerkUserId"),
    readString(metadata, "clerk_user_id"),
    readString(metadata, "clerkUserId")
  ];

  return candidates.find((value) => Boolean(value));
}

function sanitizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_POLAR_API_BASE_URL;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function parseSignatureCandidates(headerValue: string): string[] {
  const parts = headerValue
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const output: string[] = [];

  for (const part of parts) {
    if (part.startsWith("v1=")) {
      output.push(part.slice(3));
      continue;
    }
    if (part.startsWith("sha256=")) {
      output.push(part.slice(7));
      continue;
    }
    if (part === "v1") {
      continue;
    }
    output.push(part);
  }

  return output.filter((value) => value.length > 0);
}

function secureCompare(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim().length > 0 ? value : undefined;
}

async function hmacDigest(secret: string, payload: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return new Uint8Array(digest);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: Uint8Array): string {
  let output = "";
  for (const value of bytes) {
    output += String.fromCharCode(value);
  }
  return btoa(output);
}
