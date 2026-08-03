import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import { buildApp } from "../app";
import { RuleModel } from "../models/Rule";

let mongod: MongoMemoryServer;
const app = buildApp();
const TEST_SECRET = "dev-secret"; // matches env.ts fallback — no JWT_SECRET env var set in tests

// Generate a valid token for authenticated requests
const token = jwt.sign({ email: "test@example.com" }, TEST_SECRET, { subject: "user_1" });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Ensure indexes (including unique compound conditions index) are created before tests run
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

describe("POST /rules", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/rules")
      .send({ name: "test", eventType: "payment_received" });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "test" }); // missing eventType

    expect(res.status).toBe(400);
  });

  it("creates a rule successfully", async () => {
    const res = await request(app)
      .post("/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "High value payments", eventType: "payment_received", minAmount: 5000 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("High value payments");
    expect(res.body.conditions.eventType).toBe("payment_received");
    expect(res.body.conditions.minAmount).toBe(5000);
  });

  it("returns 409 for duplicate rule name", async () => {
    const payload = { name: "Duplicate rule", eventType: "overdue" };

    await request(app).post("/rules").set("Authorization", `Bearer ${token}`).send(payload);
    const res = await request(app)
      .post("/rules")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Duplicate rule");
  });

  it("returns 409 for duplicate conditions with different name", async () => {
    await request(app)
      .post("/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rule A", eventType: "dispute_raised", accountId: "acc_001" });

    const res = await request(app)
      .post("/rules")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rule B", eventType: "dispute_raised", accountId: "acc_001" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("identical conditions");
  });
});

describe("GET /rules", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/rules");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no rules exist", async () => {
    const res = await request(app).get("/rules").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
