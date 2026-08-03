# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.ts >> Webhook notification flow >> login → create rule → fire webhook → notification appears on dashboard
- Location: e2e/flow.spec.ts:7:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/E2E Payment Alert.*created/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/E2E Payment Alert.*created/i)

```

```yaml
- alert
- heading "Webhook Notifications Dashboard" [level=4]
- paragraph: 2 events · 1 notifications · 1 rule
- button
- heading "Create Rule" [level=6]
- paragraph: Rules are evaluated against incoming events.
- text: Name
- textbox "Name": E2E Payment Alert
- text: Event type
- combobox "Event type": payment_received
- text: Minimum amount
- spinbutton "Minimum amount"
- text: Account id (optional)
- textbox "Account id (optional)":
    - /placeholder: acc_1002
- checkbox "Enabled" [checked]
- text: Enabled
- alert: "{\"error\":\"A rule named \\\"E2E Payment Alert\\\" already exists.\"}"
- button "Save rule"
- heading "Incoming Events" [level=6]
- paragraph: Latest webhook payloads
- list:
    - listitem:
        - text: overdue · $200
        - paragraph: acc_e2e_dup · 8/3/2026, 9:36:31 AM
    - listitem:
        - text: payment_received · $1,500
        - paragraph: acc_e2e · 8/3/2026, 9:36:27 AM
- heading "Notifications" [level=6]
- paragraph: Generated from matching rules
- list:
    - listitem:
        - text: 'Rule "E2E Payment Alert" matched: payment_received $1500 USD on acc_e2e'
        - paragraph: E2E Payment Alert · 8/3/2026, 9:36:27 AM
        - text: pending
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | const API_URL = "http://localhost:4000";
  4  | const APP_URL = "http://localhost:3001";
  5  |
  6  | test.describe("Webhook notification flow", () => {
  7  |   test("login → create rule → fire webhook → notification appears on dashboard", async ({
  8  |     page
  9  |   }) => {
  10 |     // 1. Login
  11 |     await page.goto(APP_URL);
  12 |     await expect(page.getByText("Sign in to Dashboard")).toBeVisible();
  13 |
  14 |     await page.getByLabel("Email").fill("owner@ara-research.dev");
  15 |     await page.getByLabel("Password").fill("password123");
  16 |     await page.getByRole("button", { name: /sign in/i }).click();
  17 |
  18 |     await expect(page.getByText("Webhook Notifications Dashboard")).toBeVisible();
  19 |
  20 |     // 2. Create a rule
  21 |     await page.getByLabel("Name").fill("E2E Payment Alert");
  22 |     // eventType defaults to payment_received — no change needed
  23 |     await page.getByRole("button", { name: /save rule/i }).click();
  24 |
> 25 |     await expect(page.getByText(/E2E Payment Alert.*created/i)).toBeVisible();
     |                                                                 ^ Error: expect(locator).toBeVisible() failed
  26 |
  27 |     // 3. Fire a webhook event directly via API
  28 |     const webhookRes = await page.request.post(`${API_URL}/webhooks/events`, {
  29 |       data: {
  30 |         id: `e2e_evt_${Date.now()}`,
  31 |         type: "payment_received",
  32 |         accountId: "acc_e2e",
  33 |         amount: 1500,
  34 |         currency: "USD"
  35 |       }
  36 |     });
  37 |     expect(webhookRes.status()).toBe(200);
  38 |
  39 |     // 4. Wait for notification to appear (dashboard polls every 4s)
  40 |     await expect(
  41 |       page.getByText(/E2E Payment Alert.*matched/i)
  42 |     ).toBeVisible({ timeout: 10000 });
  43 |   });
  44 |
  45 |   test("duplicate webhook event is handled idempotently", async ({ page }) => {
  46 |     const eventId = `e2e_dup_${Date.now()}`;
  47 |     const payload = {
  48 |       id: eventId,
  49 |       type: "overdue",
  50 |       accountId: "acc_e2e_dup",
  51 |       amount: 200,
  52 |       currency: "USD"
  53 |     };
  54 |
  55 |     const first = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
  56 |     expect(first.status()).toBe(200);
  57 |     expect((await first.json()).duplicate).toBeUndefined();
  58 |
  59 |     const second = await page.request.post(`${API_URL}/webhooks/events`, { data: payload });
  60 |     expect(second.status()).toBe(200);
  61 |     expect((await second.json()).duplicate).toBe(true);
  62 |   });
  63 | });
  64 |
```
