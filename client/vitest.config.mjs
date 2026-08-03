import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      thresholds: { lines: 70 },
      include: ["lib/**/*.ts", "context/**/*.tsx", "hooks/**/*.tsx", "components/**/*.tsx"],
      exclude: ["**/__tests__/**", "**/*.test.{ts,tsx}"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  }
});
