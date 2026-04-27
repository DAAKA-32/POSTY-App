import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    // Don't pollute next build — exclude node_modules and Next's .next folder
    exclude: ["node_modules/**", ".next/**", "out/**"],
  },
});
