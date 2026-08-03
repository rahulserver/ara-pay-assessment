import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:4000";
const APP_URL = "http://localhost:3001";

test.describe("Webhook notification flow", () => {
  test("login → create rule → fire webhook → notification appears on dashboard", async ({
    page
  }) => {
    // 1. Login
    await page.goto(APP_URL);
    await expect(page.getByText("Sign in to Dashboard")).toBeVisible();

    await page.getByLabel("Email").fill("owner@ara-research.dev");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Webhook Notifications Dashboard")).toBeVisible();

    // 2. Create a rule
    await page.getByLabel("Name").fill("E2E Payment Alert");
    // eventType defaults to payment_received — no change needed
    await page.getByRole("button", { name: /save rule/i }).click();

    // Form resets on success — name field goes empty. More reliable than the auto-dismissing toast.
    await expect(page.getByLabel("Name")).toHaveValue("", { timeout: 5000 });

    // 3. Fire a webhook event directly via API
    const webhookRes = await page.request.post(`${API_URL}/webhooks/events`, {
      data: {
        id: `e2e_evt_${Date.now()}`,
        type: "payment_received",
        accountId: "acc_e2e",
        amount: 1500,
        currency: "USD"
      }
    });
    expect(webhookRes.status()).toBe(200);

    // 4. Wait for notification to appear (dashboard polls every 4s)
    await expect(
      page.getByText(/E2E Payment Alert.*matched/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("duplicate webhook event is handled idempotently", async ({ page }) => {
    const eventId = `e2e_dup_${Date.now()}`;
    const payload = {
      id: eventId,
      type: "overdue",
      accountId: "acc_e2e_dup",
      amount: 200,
      currency: "USD"
    };

    const first = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
    expect(first.status()).toBe(200);
    expect((await first.json()).duplicate).toBeUndefined();

    const second = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
    expect(second.status()).toBe(200);
    expect((await second.json()).duplicate).toBe(true);
  });
});
