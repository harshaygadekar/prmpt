import { loadExtensionEnv } from "./env.js";
import { ExtensionAuthService, SecretStorageAuthSessionStore } from "./auth/index.js";
import { createEntitlementClient, createUpgradeManager } from "./entitlement/index.js";
import {
  AUTH_SIGN_IN_COMMAND,
  AUTH_SIGN_OUT_COMMAND,
  AUTH_SIGN_UP_COMMAND,
  ENTITLEMENT_UPGRADE_COMMAND,
  ENTITLEMENT_REFRESH_COMMAND,
  buildAuthCommandMessage,
  createNoopHostApi,
  type ExtensionContextLike,
  type ExtensionHostApi
} from "./host.js";

export function activate(
  context: ExtensionContextLike,
  host: ExtensionHostApi = createNoopHostApi()
): void {
  const env = loadExtensionEnv();
  const authService = new ExtensionAuthService({
    appBaseUrl: env.appBaseUrl,
    callbackUri: env.vscodeCallbackUri,
    sessionStore: new SecretStorageAuthSessionStore(context.secrets)
  });

  let currentUserId: string | undefined;

  const entitlementClient = createEntitlementClient({ baseUrl: env.appBaseUrl });
  const upgradeManager = createUpgradeManager({
    client: entitlementClient,
    openExternal: (url) => host.openExternal(url),
    showInfo: (msg) => host.showInformationMessage(msg),
    showWarning: (msg, ...acts) => host.showWarningMessage(msg, ...acts),
    showError: (msg) => host.showErrorMessage(msg)
  });

  context.subscriptions.push(
    host.registerCommand(AUTH_SIGN_IN_COMMAND, async () => {
      await authService.startAuth({
        mode: "sign-in",
        openExternal: (url) => host.openExternal(url)
      });
      host.showInformationMessage(buildAuthCommandMessage("sign-in"));
    })
  );

  context.subscriptions.push(
    host.registerCommand(AUTH_SIGN_UP_COMMAND, async () => {
      await authService.startAuth({
        mode: "sign-up",
        openExternal: (url) => host.openExternal(url)
      });
      host.showInformationMessage(buildAuthCommandMessage("sign-up"));
    })
  );

  context.subscriptions.push(
    host.registerCommand(AUTH_SIGN_OUT_COMMAND, async () => {
      await authService.signOut();
      host.showInformationMessage("Signed out.");
    })
  );

  context.subscriptions.push(
    host.registerUriHandler({
      async handleUri(uri: string) {
        try {
          const session = await authService.handleCallbackUri(uri);
          currentUserId = session.code;
          host.showInformationMessage("Authentication successful.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Authentication failed.";
          host.showErrorMessage(message);
        }
      }
    })
  );

  context.subscriptions.push(
    host.registerCommand(ENTITLEMENT_UPGRADE_COMMAND, async () => {
      if (!currentUserId) {
        host.showErrorMessage("Please sign in before upgrading.");
        return;
      }
      await upgradeManager.promptUpgrade(currentUserId);
    })
  );

  context.subscriptions.push(
    host.registerCommand(ENTITLEMENT_REFRESH_COMMAND, async () => {
      if (!currentUserId) {
        host.showErrorMessage("Please sign in before refreshing subscription.");
        return;
      }
      await upgradeManager.refreshEntitlement(currentUserId);
    })
  );

  void authService.getSessionState().then(async (status) => {
    if (status.state === "expired") {
      await authService.signOut();
      currentUserId = undefined;
      host.showInformationMessage("Saved session expired. Please sign in again.");
    } else if (status.state === "valid" && status.session) {
      currentUserId = status.session.code;
    }
  });
}

export function deactivate(): void {
  // Reserved for extension lifecycle cleanup once host services are wired.
}
