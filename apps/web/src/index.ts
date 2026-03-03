import type { BootstrapResponse } from "@prmpt/contracts";
import { SupabasePaymentEventRepository } from "@prmpt/data-access";
import { loadWebEnv } from "./env.js";
import { createEntitlementReadApi } from "./api/entitlement-read.js";
import {
  createExtensionBootstrapApi,
  createSupabaseUserRepository
} from "./api/extension-bootstrap.js";
import { createPolarCheckoutApi } from "./api/payment-checkout-polar.js";
import { createPolarWebhookApi } from "./api/payment-webhook-polar.js";
import { createUsageConsumeApi } from "./api/usage-consume.js";
import { createAuthPortalRouter } from "./auth/index.js";
import { createPolarEntitlementProvider } from "./entitlement/provider.js";

export function bootstrapWebStub(): BootstrapResponse {
  const env = loadWebEnv();

  return {
    userId: env.appBaseUrl.includes("localhost") ? "local-dev" : "unknown",
    sessionLimit: 9,
    remainingSessions: 9,
    isPremium: false
  };
}

export function createWebAuthRouter() {
  const env = loadWebEnv();

  return createAuthPortalRouter({
    env: {
      appBaseUrl: env.appBaseUrl,
      clerkSignInUrl: env.clerkSignInUrl,
      clerkSignUpUrl: env.clerkSignUpUrl
    }
  });
}

export const handleExtensionBootstrap = (() => {
  const env = loadWebEnv();
  const userRepository = createSupabaseUserRepository({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey
  });

  return createExtensionBootstrapApi({ userRepository });
})();

export const handleUsageConsume = (() => {
  const env = loadWebEnv();
  const userRepository = createSupabaseUserRepository({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey
  });

  return createUsageConsumeApi({ userRepository });
})();

export const handlePolarCheckout = (() => {
  const env = loadWebEnv();
  const userRepository = createSupabaseUserRepository({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey
  });
  const paymentEventRepository = new SupabasePaymentEventRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey
  });
  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: env.polar?.webhookSecret,
    userRepository,
    paymentEventRepository,
    checkout: env.polar
      ? {
          accessToken: env.polar.accessToken,
          productId: env.polar.productId,
          priceId: env.polar.priceId,
          successUrl: env.polar.successUrl,
          cancelUrl: env.polar.cancelUrl,
          apiBaseUrl: env.polar.apiBaseUrl
        }
      : undefined
  });

  return createPolarCheckoutApi({ entitlementProvider });
})();

export const handlePolarWebhook = (() => {
  const env = loadWebEnv();
  const userRepository = createSupabaseUserRepository({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey
  });
  const paymentEventRepository = new SupabasePaymentEventRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey
  });
  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: env.polar?.webhookSecret,
    userRepository,
    paymentEventRepository,
    checkout: env.polar
      ? {
          accessToken: env.polar.accessToken,
          productId: env.polar.productId,
          priceId: env.polar.priceId,
          successUrl: env.polar.successUrl,
          cancelUrl: env.polar.cancelUrl,
          apiBaseUrl: env.polar.apiBaseUrl
        }
      : undefined
  });

  return createPolarWebhookApi({
    entitlementProvider
  });
})();

export const handleEntitlementRead = (() => {
  const env = loadWebEnv();
  const userRepository = createSupabaseUserRepository({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey
  });
  const paymentEventRepository = new SupabasePaymentEventRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey
  });
  const entitlementProvider = createPolarEntitlementProvider({
    webhookSecret: env.polar?.webhookSecret,
    userRepository,
    paymentEventRepository,
    checkout: env.polar
      ? {
          accessToken: env.polar.accessToken,
          productId: env.polar.productId,
          priceId: env.polar.priceId,
          successUrl: env.polar.successUrl,
          cancelUrl: env.polar.cancelUrl,
          apiBaseUrl: env.polar.apiBaseUrl
        }
      : undefined
  });

  return createEntitlementReadApi({
    entitlementProvider
  });
})();
