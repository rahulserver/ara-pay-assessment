import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthError, getToken, setToken, clearToken } from "../lib/auth";

const TOKEN_KEY = "webhookpulse_token";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AuthError", () => {
  it("is an instance of Error", () => {
    const err = new AuthError();
    expect(err).toBeInstanceOf(Error);
  });

  it("has the correct message and name", () => {
    const err = new AuthError();
    expect(err.message).toBe("Session expired. Please log in again.");
    expect(err.name).toBe("AuthError");
  });
});

describe("token storage", () => {
  it("getToken returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken stores the token, getToken retrieves it", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
  });

  it("clearToken removes the token", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
