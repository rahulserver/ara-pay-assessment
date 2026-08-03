import cors from "cors";
import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import notificationsRoutes from "./routes/notifications";
import rulesRoutes from "./routes/rules";
import webhookRoutes from "./routes/webhooks";

export function buildApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use("/auth", authRoutes);
  app.use("/webhooks", webhookRoutes);
  app.use("/rules", rulesRoutes);
  app.use("/notifications", notificationsRoutes);

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[server] unhandled error", err);
      res.status(500).json({ error: "internal server error" });
    }
  );

  return app;
}
