import "./config/env";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { ensureDefaultUser } from "./routes/auth";
import { buildApp } from "./app";

async function main() {
  await connectDatabase();
  await ensureDefaultUser();

  const app = buildApp();

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("[server] startup failed", error);
  process.exit(1);
});
