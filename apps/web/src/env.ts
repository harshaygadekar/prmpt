import { getRuntimeEnv, readEnvVar, validateEnv } from "@prmpt/shared-utils";

const WEB_REQUIRED_ENV = [
  "APP_BASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

const PAYMENT_REQUIRED_ENV = [
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_PRODUCT_ID",
  "POLAR_PRICE_ID"
] as const;

export interface WebEnv {
  appBaseUrl: string;
  clerkSignInUrl: string;
  clerkSignUpUrl: string;
  clerkPublishableKey: string;
  clerkSecretKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  polar:
    | {
      accessToken: string;
      webhookSecret: string;
      productId: string;
      priceId: string;
      apiBaseUrl: string;
      successUrl: string;
      cancelUrl: string;
      }
    | undefined;
}

export interface WebEnvOptions {
  requirePayments?: boolean;
}

export function loadWebEnv(rawEnv = getRuntimeEnv(), options: WebEnvOptions = {}): WebEnv {
  validateEnv("apps/web", rawEnv, {
    required: [...WEB_REQUIRED_ENV, ...(options.requirePayments ? [...PAYMENT_REQUIRED_ENV] : [])]
  });

  const polarConfigured = PAYMENT_REQUIRED_ENV.every((key) => Boolean(readEnvVar(rawEnv, key)));
  const polarEnvironment = readEnvVar(rawEnv, "POLAR_ENV") ?? "sandbox";
  const defaultPolarApiBaseUrl =
    polarEnvironment.toLowerCase() === "production" ? "https://api.polar.sh" : "https://sandbox-api.polar.sh";
  const polarApiBaseUrl = readEnvVar(rawEnv, "POLAR_API_BASE_URL") ?? defaultPolarApiBaseUrl;
  const polarSuccessUrl =
    readEnvVar(rawEnv, "POLAR_SUCCESS_URL") ??
    `${readEnvVar(rawEnv, "APP_BASE_URL") as string}/api/v1/payment/success`;
  const polarCancelUrl =
    readEnvVar(rawEnv, "POLAR_CANCEL_URL") ??
    `${readEnvVar(rawEnv, "APP_BASE_URL") as string}/api/v1/payment/cancel`;

  return {
    appBaseUrl: readEnvVar(rawEnv, "APP_BASE_URL") as string,
    clerkSignInUrl:
      readEnvVar(rawEnv, "CLERK_SIGN_IN_URL") ??
      `${readEnvVar(rawEnv, "APP_BASE_URL") as string}/auth/sign-in`,
    clerkSignUpUrl:
      readEnvVar(rawEnv, "CLERK_SIGN_UP_URL") ??
      `${readEnvVar(rawEnv, "APP_BASE_URL") as string}/auth/sign-up`,
    clerkPublishableKey: readEnvVar(rawEnv, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") as string,
    clerkSecretKey: readEnvVar(rawEnv, "CLERK_SECRET_KEY") as string,
    supabaseUrl: readEnvVar(rawEnv, "SUPABASE_URL") as string,
    supabaseAnonKey: readEnvVar(rawEnv, "SUPABASE_ANON_KEY") as string,
    supabaseServiceRoleKey: readEnvVar(rawEnv, "SUPABASE_SERVICE_ROLE_KEY") as string,
    polar: polarConfigured
      ? {
          accessToken: readEnvVar(rawEnv, "POLAR_ACCESS_TOKEN") as string,
          webhookSecret: readEnvVar(rawEnv, "POLAR_WEBHOOK_SECRET") as string,
          productId: readEnvVar(rawEnv, "POLAR_PRODUCT_ID") as string,
          priceId: readEnvVar(rawEnv, "POLAR_PRICE_ID") as string,
          apiBaseUrl: polarApiBaseUrl,
          successUrl: polarSuccessUrl,
          cancelUrl: polarCancelUrl
        }
      : undefined
  };
}
