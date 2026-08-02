import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import { buildApp } from "../app";
import { EventModel } from "../models/Event";
import { NotificationModel } from "../models/Notification";
import { RuleModel } from "../models/Rule";

let mongod: MongoMemoryServer;
const app = buildApp();
const token = jwt.sign({ email: "test@example.com" }, "dev-secret", { subject: "user_1" });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
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

describe("GET /notifications/events", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/notifications/events");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no events exist", async () => {
    const res = await request(app)
      .get("/notifications/events")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns persisted events", async () => {
    await EventModel.create({
      sourceEventId: "evt_test_1",
      type: "payment_received",
      accountId: "acc_001",
      amount: 500,
      currency: "USD",
      createdAt: new Date()
    });

    const res = await request(app)
      .get("/notifications/events")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sourceEventId).toBe("evt_test_1");
  });
});

describe("GET /notifications", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no notifications exist", async () => {
    const res = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns notifications with populated event and rule", async () => {
    const event = await EventModel.create({
      sourceEventId: "evt_notif_1",
      type: "overdue",
      accountId: "acc_002",
      amount: 1000,
      currency: "USD",
      createdAt: new Date()
    });

    const rule = await RuleModel.create({
      name: "Overdue alerts",
      enabled: true,
      channel: "in_app",
      conditions: { eventType: "overdue" }
    });

    await NotificationModel.create({
      eventId: event._id,
      ruleId: rule._id,
      status: "pending",
      message: "Rule matched"
    });

    const res = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].message).toBe("Rule matched");
    expect(res.body[0].ruleId.name).toBe("Overdue alerts");
  });
});
