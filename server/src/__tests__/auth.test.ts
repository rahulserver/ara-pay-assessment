import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { buildApp } from "../app";
import { UserModel } from "../models/User";
import bcrypt from "bcryptjs";

let mongod: MongoMemoryServer;
const app = buildApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const passwordHash = await bcrypt.hash("password123", 10);
  await UserModel.create({ email: "test@example.com", passwordHash, role: "analyst" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /auth/login", () => {
  it("returns 400 when email or password is missing", async () => {
    const res = await request(app).post("/auth/login").send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns token on valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
  });
});
