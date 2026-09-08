import { MongoClient } from "mongodb";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://root:root@localhost:27018/webhookpulse?authSource=admin";

export default async function globalSetup() {
  console.log("[e2e setup] connecting to MongoDB...");
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db();
  await Promise.all([
    db.collection("events").deleteMany({}),
    db.collection("notifications").deleteMany({}),
    db.collection("rules").deleteMany({})
  ]);

  console.log("[e2e setup] database cleared");
  await client.close();
}
