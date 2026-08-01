import "./config/env";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { Http } from "./constants";
import authRoutes, { ensureDefaultUser } from "./routes/auth";
import notificationsRoutes from "./routes/notifications";
import rulesRoutes from "./routes/rules";
import webhookRoutes from "./routes/webhooks";

async function main() {
  await connectDatabase();
  await ensureDefaultUser();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: Http.MAX_REQUEST_BODY_SIZE }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use("/auth", authRoutes);
  app.use("/webhooks", webhookRoutes);
  app.use("/rules", rulesRoutes);
  app.use("/notifications", notificationsRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[server] unhandled error", err);
    res.status(500).json({ error: "internal server error" });
  });

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("[server] startup failed", error);
  process.exit(1);
});
