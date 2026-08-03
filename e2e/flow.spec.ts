import { test, expect } from "@playwright/test";
import { MongoClient } from "mongodb";

const API_URL = "http://localhost:4000";
const APP_URL = "http://localhost:3001";
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://root:root@localhost:27018/ara_assessment?authSource=admin";

async function clearDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  await Promise.all([
    db.collection("events").deleteMany({}),
    db.collection("notifications").deleteMany({}),
    db.collection("rules").deleteMany({})
  ]);
  await client.close();
}

async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(APP_URL);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Webhook Notifications Dashboard")).toBeVisible();
}

async function fireEvent(
  page: import("@playwright/test").Page,
  overrides: Record<string, unknown> = {}
) {
  return page.request.post(`${API_URL}/webhooks/events`, {
    data: {
      id: `e2e_evt_${Date.now()}_${Math.random()}`,
      type: "payment_received",
      accountId: "acc_e2e",
      amount: 1500,
      currency: "USD",
      ...overrides
    }
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

test.describe("Authentication", () => {
  test("shows login screen when not authenticated", async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.getByText("Sign in to Dashboard")).toBeVisible();
  });

  test("login fails with wrong password", async ({ page }) => {
    await page.goto(APP_URL);
    await page.getByLabel("Email").fill("owner@ara-research.dev");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test("login succeeds with valid credentials", async ({ page }) => {
    await loginAs(page, "owner@ara-research.dev", "password123");
  });
});

// ─── Rules ───────────────────────────────────────────────────────────────────

test.describe("Rule management", () => {
  test.beforeEach(async ({ page }) => {
    await clearDB();
    await loginAs(page, "owner@ara-research.dev", "password123");
  });

  test("creates a rule and resets the form", async ({ page }) => {
    await page.getByLabel("Name").fill("Test Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });
  });

  test("shows error for duplicate rule name", async ({ page }) => {
    await page.getByLabel("Name").fill("Duplicate Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    await page.getByLabel("Name").fill("Duplicate Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test("shows validation error for negative minimum amount", async ({ page }) => {
    await page.getByLabel("Name").fill("Bad Amount Rule");

    // Set the value via React's internal state tracker so it survives re-renders
    await page.getByLabel(/minimum amount/i).evaluate((input) => {
      const el = input as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set;
      nativeSetter!.call(el, "-100");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Disable browser native validation so our React handleSubmit can run
    await page.evaluate(() => {
      document.querySelector("form")?.setAttribute("novalidate", "");
    });

    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByText(/positive number/i)).toBeVisible();
  });

  test("rule count increments after creation", async ({ page }) => {
    const headerText = page.getByText(/\d+ rules?/);
    const before = await headerText.textContent();
    const beforeCount = parseInt(before?.match(/(\d+) rule/)?.[1] ?? "0");

    await page.getByLabel("Name").fill("Count Test Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    await expect(page.getByText(`${beforeCount + 1} rule`)).toBeVisible();
  });

  test("hovering rule count shows rule names in tooltip", async ({ page }) => {
    await page.getByLabel("Name").fill("Tooltip Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    await page.getByText(/1 rule/).hover();
    await expect(page.getByText("Tooltip Rule")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Webhook + Pipeline ──────────────────────────────────────────────────────

test.describe("Webhook event pipeline", () => {
  test("duplicate webhook event is handled idempotently", async ({ page }) => {
    const eventId = `e2e_dup_${Date.now()}`;
    const payload = { id: eventId, type: "overdue", accountId: "acc_e2e_dup", amount: 200 };

    const first = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
    expect(first.status()).toBe(200);
    expect((await first.json()).duplicate).toBeUndefined();

    const second = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
    expect(second.status()).toBe(200);
    expect((await second.json()).duplicate).toBe(true);
  });

  test("invalid event payload returns 400", async ({ page }) => {
    const res = await page.request.post(`${API_URL}/webhooks/events`, {
      data: { id: "bad_evt", type: "unknown_type", accountId: "acc_1" }
    });
    expect(res.status()).toBe(400);
  });

  test("event without a matching rule creates no notification", async ({ page }) => {
    await clearDB();
    await loginAs(page, "owner@ara-research.dev", "password123");

    // No rules exist — fire event, wait one poll cycle
    await fireEvent(page, { id: `e2e_nomatch_${Date.now()}` });
    await page.waitForTimeout(5000);
    await expect(page.getByText(/no notifications yet/i)).toBeVisible();
  });
});

// ─── Full E2E Flow ───────────────────────────────────────────────────────────

test.describe("Full notification flow", () => {
  test.beforeEach(async () => {
    await clearDB();
  });

  test("login → create rule → fire webhook → notification appears on dashboard", async ({
    page
  }) => {
    await loginAs(page, "owner@ara-research.dev", "password123");

    await page.getByLabel("Name").fill("E2E Payment Alert");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    const res = await fireEvent(page);
    expect(res.status()).toBe(200);

    await expect(page.getByText(/E2E Payment Alert.*matched/i)).toBeVisible({ timeout: 10000 });
  });

  test("catch-all rule fires for any matching eventType", async ({ page }) => {
    await loginAs(page, "owner@ara-research.dev", "password123");

    await page.getByLabel("Name").fill("Catch-All Payment Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    const res = await fireEvent(page, { id: `e2e_catchall_${Date.now()}`, accountId: "acc_other" });
    expect(res.status()).toBe(200);

    await expect(
      page.getByText(/Catch-All Payment Rule.*matched/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("specific rule suppresses catch-all (specificity)", async ({ page }) => {
    await loginAs(page, "owner@ara-research.dev", "password123");

    // Create catch-all rule (score 0)
    await page.getByLabel("Name").fill("Generic Payment Rule");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    // Create specific rule (score 1 — with accountId)
    await page.getByLabel("Name").fill("Specific Account Rule");
    await page.getByLabel(/account id/i).fill("acc_specific");
    await page.getByRole("button", { name: /save rule/i }).click();
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    // Fire event for acc_specific
    const res = await fireEvent(page, {
      id: `e2e_specific_${Date.now()}`,
      accountId: "acc_specific"
    });
    expect(res.status()).toBe(200);

    // Specific rule fires
    await expect(page.getByText(/Specific Account Rule.*matched/i)).toBeVisible({
      timeout: 10000
    });

    // Generic rule suppressed — only 1 notification
    await expect(page.getByText(/Generic Payment Rule.*matched/i)).not.toBeVisible();
  });
});

