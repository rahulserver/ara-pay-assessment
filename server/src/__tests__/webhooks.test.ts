import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { buildApp } from "../app";
import { NotificationModel } from "../models/Notification";
import { RuleModel } from "../models/Rule";
import { EventModel } from "../models/Event";

let mongod: MongoMemoryServer;
const app = buildApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await EventModel.syncIndexes();
  await RuleModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("POST /webhooks/events", () => {
  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({ id: "evt_1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid event payload");
  });

  it("returns 400 for invalid eventType", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({ id: "evt_1", type: "unknown_type", accountId: "acc_001", amount: 100 });

    expect(res.status).toBe(400);
  });

  it("persists a valid event and returns 200", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({ id: "evt_1", type: "payment_received", accountId: "acc_001", amount: 500 });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.eventId).toBe("evt_1");
  });

  it("returns 200 with duplicate:true for replayed event", async () => {
    const payload = { id: "evt_dup", type: "overdue", accountId: "acc_002", amount: 200 };

    await request(app).post("/webhooks/events").send(payload);
    const res = await request(app).post("/webhooks/events").send(payload);

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
  });

  it("creates a notification when a matching rule exists", async () => {
    await RuleModel.create({
      name: "High value",
      enabled: true,
      channel: "in_app",
      conditions: { eventType: "payment_received", minAmount: 1000 }
    });

    await request(app)
      .post("/webhooks/events")
      .send({ id: "evt_pipeline", type: "payment_received", accountId: "acc_001", amount: 5000 });

    // Pipeline is fire-and-forget — wait briefly for it to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    const notifications = await NotificationModel.find({});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain("High value");
  });
});
