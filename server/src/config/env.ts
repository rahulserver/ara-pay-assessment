import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: required(
    "MONGO_URI",
    "mongodb://root:root@localhost:27018/webhookpulse?authSource=admin"
  ),
  jwtSecret: required("JWT_SECRET", "dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h"
};
