import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserModel } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Ensures that a default user exists in the database.
// If not, it creates one with a predefined email and password.
export async function ensureDefaultUser(): Promise<void> {
  const existing = await UserModel.findOne({ email: "owner@ara-research.dev" });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  await UserModel.create({
    email: "owner@ara-research.dev",
    passwordHash,
    role: "owner"
  });

  console.log("[auth] seeded default owner user");
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ email: user.email }, env.jwtSecret, {
      subject: user.id,
      expiresIn: env.jwtExpiresIn as `${number}${"s" | "m" | "h" | "d" | "w"}`
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  })
);

export default router;
