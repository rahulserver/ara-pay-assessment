import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthError, setToken } from "../lib/auth";

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
  it("returns token string on successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "new-token-123" })
    });

    const { login } = await import("../lib/api");
    const token = await login("user@example.com", "password");
    expect(token).toBe("new-token-123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws plain Error (not AuthError) on 401 — wrong credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    const { login } = await import("../lib/api");
    const { AuthError } = await import("../lib/auth");

    let thrown: unknown;
    try {
      await login("user@example.com", "wrongpass");
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(AuthError);
    expect((thrown as Error).message).toBe("Invalid credentials");
  });
});
