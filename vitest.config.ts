import { defineConfig } from "vitest/config";

// The server runs on Baghdad time; the tests run on it too, so a clock-zone mistake shows up here first.
process.env.TZ = "Asia/Baghdad";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/web/test/**/*.test.ts"],
    env: { TZ: "Asia/Baghdad" },
  },
});
