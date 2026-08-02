import { EventRecord, NotificationRecord, RuleDraft, RuleRecord } from "./types";
import { AuthError, clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      throw new AuthError();
    }
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Returns the raw token string — caller is responsible for storing it. */
export async function login(email: string, password: string): Promise<string> {
  const result = await request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  return result.token;
}

export async function fetchEvents(): Promise<EventRecord[]> {
  return request<EventRecord[]>("/notifications/events?limit=40");
}

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  return request<NotificationRecord[]>("/notifications?limit=40");
}

export async function fetchRules(): Promise<RuleRecord[]> {
  return request<RuleRecord[]>("/rules");
}

export async function saveRule(payload: RuleDraft): Promise<RuleRecord> {
  return request<RuleRecord>("/rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
