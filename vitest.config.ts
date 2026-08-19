import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**"],
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/workers.test.ts",
      "tests/deno/**",
    ],
  },
});
