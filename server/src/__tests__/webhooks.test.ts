import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { buildApp } from "../app";

let mongod: MongoMemoryServer;
const app = buildApp();

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
});
