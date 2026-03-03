import type { AuthMode } from "./auth/index.js";

export const AUTH_SIGN_IN_COMMAND = "prmpt.auth.signIn";
export const AUTH_SIGN_UP_COMMAND = "prmpt.auth.signUp";
export const AUTH_SIGN_OUT_COMMAND = "prmpt.auth.signOut";

export interface DisposableLike {
  dispose(): void;
}

export interface SecretStorageLike {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ExtensionContextLike {
  secrets: SecretStorageLike;
  subscriptions: {
    push(...items: DisposableLike[]): number;
  };
}

export interface UriHandlerLike {
  handleUri(uri: string): Promise<void> | void;
}

export interface ExtensionHostApi {
  registerCommand(commandId: string, callback: () => Promise<void> | void): DisposableLike;
  registerUriHandler(handler: UriHandlerLike): DisposableLike;
  openExternal(url: string): Promise<boolean>;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
}

export function buildAuthCommandMessage(mode: AuthMode): string {
  return mode === "sign-in" ? "Sign-in started in browser." : "Sign-up started in browser.";
}

export function createNoopHostApi(): ExtensionHostApi {
  return {
    registerCommand() {
      return { dispose() {} };
    },
    registerUriHandler() {
      return { dispose() {} };
    },
    async openExternal() {
      return true;
    },
    showInformationMessage() {
      return;
    },
    showErrorMessage() {
      return;
    }
  };
}
