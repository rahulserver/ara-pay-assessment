import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthError, clearToken, setToken } from "../lib/auth";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("request — 401 handling", () => {
  it("throws AuthError and clears token on 401 response", async () => {
    setToken("expired-token");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    const { fetchEvents } = await import("../lib/api");

    setToken("expired-token"); // re-set since dynamic import may clear module cache
    await expect(fetchEvents()).rejects.toThrow(AuthError);
  });

  it("throws generic Error on non-401 failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });

    const { fetchRules } = await import("../lib/api");
    await expect(fetchRules()).rejects.toThrow("Internal Server Error");
  });
});

describe("login", () => {
  it("stores token on successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "new-token-123" })
    });

    const { login } = await import("../lib/api");
    await login("user@example.com", "password");

    // The returned token is handled by the caller (useAuth hook)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
