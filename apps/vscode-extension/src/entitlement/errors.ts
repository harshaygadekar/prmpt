const USER_FACING_MESSAGES: Record<string, string> = {
  trial_exhausted:
    "Your free trial has ended (9 sessions used). Upgrade to Premium for unlimited prompt optimization.",
  payments_unavailable:
    "Payment processing is temporarily unavailable. Please try again later.",
  invalid_signature:
    "Payment verification failed. Please contact support if this persists.",
  provider_error:
    "An error occurred with the payment provider. Please try again.",
  invalid_request:
    "The request could not be processed. Please try again.",
  network_error:
    "Unable to reach prmpt servers. Please check your internet connection.",
  checkout_failed:
    "Checkout could not be completed. Please try again or contact support.",
  entitlement_refresh_failed:
    "Could not refresh your subscription status. Please try again later.",
  unknown_error:
    "An unexpected error occurred. Please try again or contact support."
};

const ERROR_SUPPORT_CODES: Record<string, string> = {
  trial_exhausted: "E-TRIAL-001",
  payments_unavailable: "E-PAY-001",
  invalid_signature: "E-PAY-002",
  provider_error: "E-PAY-003",
  checkout_failed: "E-PAY-004",
  network_error: "E-NET-001",
  entitlement_refresh_failed: "E-ENT-001",
  invalid_request: "E-REQ-001",
  unknown_error: "E-GEN-001"
};

export function getUserFacingMessage(errorCode: string): string {
  return (
    USER_FACING_MESSAGES[errorCode] ??
    USER_FACING_MESSAGES["unknown_error"] ??
    "An unexpected error occurred."
  );
}

export function getSupportCode(errorCode: string): string {
  return (
    ERROR_SUPPORT_CODES[errorCode] ??
    ERROR_SUPPORT_CODES["unknown_error"] ??
    "E-GEN-001"
  );
}

export function formatUserError(errorCode: string): string {
  const message = getUserFacingMessage(errorCode);
  const supportCode = getSupportCode(errorCode);
  return `${message} (${supportCode})`;
}
