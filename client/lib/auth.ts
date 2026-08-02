/** Thrown when the server returns 401. Signals the session has expired. */
export class AuthError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
    this.name = "AuthError";
  }
}

const TOKEN_KEY = "ara_fullstack_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
