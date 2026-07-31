import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000
  });

  console.log(`[db] connected to ${env.mongoUri}`);
}
