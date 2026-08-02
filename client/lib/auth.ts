/** Thrown when the server returns 401. Signals the session has expired. */
export class AuthError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
    this.name = "AuthError";
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("ara_fullstack_token");
}
