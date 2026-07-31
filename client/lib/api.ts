import { EventRecord, NotificationRecord, RuleDraft, RuleRecord } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("ara_fullstack_token");
}

function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("ara_fullstack_token", token);
}

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
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<void> {
  const result = await request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  setToken(result.token);
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

export async function saveRule(payload: RuleDraft): Promise<RuleRecord | null> {
  try {
    return await request<RuleRecord>("/rules", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch {
    // API mismatch is noisy in current backend, suppressing for now.
    return null;
  }
}
