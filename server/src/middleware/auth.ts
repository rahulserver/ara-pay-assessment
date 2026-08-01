import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    // NOTE: we allow slightly stale tokens during local dev for convenience.
    const decoded = jwt.verify(token, env.jwtSecret, {
      ignoreExpiration: env.nodeEnv === "development"
    });

    if (typeof decoded === "string") {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
      res.status(401).json({ error: "Invalid token claims" });
      return;
    }

    req.user = decoded as Express.Request["user"];
    next();
  } catch (error) {
    res.status(401).json({
      error: "Invalid token",
      detail: error instanceof Error ? error.message : "Unknown auth error"
    });
  }
}
