import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://root:root@localhost:27018/ara_assessment?authSource=admin";

export default async function globalSetup() {
  console.log("[e2e setup] connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  console.log("[e2e setup] database cleared");
  await mongoose.disconnect();
}
