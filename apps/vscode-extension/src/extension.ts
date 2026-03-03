import { loadExtensionEnv } from "./env.js";
import { ExtensionAuthService, SecretStorageAuthSessionStore } from "./auth/index.js";
import {
  AUTH_SIGN_IN_COMMAND,
  AUTH_SIGN_OUT_COMMAND,
  AUTH_SIGN_UP_COMMAND,
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
          await authService.handleCallbackUri(uri);
          host.showInformationMessage("Authentication successful.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Authentication failed.";
          host.showErrorMessage(message);
        }
      }
    })
  );

  void authService.getSessionState().then(async (status) => {
    if (status.state === "expired") {
      await authService.signOut();
      host.showInformationMessage("Saved session expired. Please sign in again.");
    }
  });
}

export function deactivate(): void {
  // Reserved for extension lifecycle cleanup once host services are wired.
}
