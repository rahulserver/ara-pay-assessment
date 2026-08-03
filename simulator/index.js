const endpoint = process.env.WEBHOOK_URL || "http://localhost:4000/webhooks/events";
const intervalMs = Number(process.env.INTERVAL_MS || 2000);

const eventTypes = ["payment_received", "overdue", "dispute_raised", "invoice_created"];
const accounts = ["acc_1001", "acc_1002", "acc_1003", "acc_1012", "acc_1017", "acc_1024"];
// Returns a random item from the given array
function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Returns a random amount between 500 and 9500
function randomAmount() {
  return Math.floor(Math.random() * 9000 + 500);
}

// Generates a random event object
function makeEvent() {
  // Generate a unique ID for the event in the format: evt_<timestamp>_<random_number between 0 and 999>
  const id = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const type = randomFrom(eventTypes);
  const accountId = randomFrom(accounts);
  const amount = randomAmount();

  return {
    id,
    type,
    accountId,
    amount,
    currency: "USD",
    createdAt: new Date().toISOString(),
    payload: {
      source: "simulator",
      notes: "generated event"
    }
  };
}

// Sends a random event to the webhook endpoint
async function send() {
  const event = makeEvent();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    const text = await response.text();
    console.log(`[simulator] ${response.status} ${event.id} ${text}`);
  } catch (error) {
    console.error("[simulator] failed to send event", error);
  }
}

console.log(`[simulator] sending events to ${endpoint} every ${intervalMs}ms`);
send();

// Schedule the send function to run every specified intervalMs
setInterval(send, intervalMs);
