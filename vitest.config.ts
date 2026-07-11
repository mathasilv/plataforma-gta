import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mesmo alias do tsconfig ("@/..." -> "./src/...").
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
