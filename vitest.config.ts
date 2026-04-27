import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@backend": path.resolve(__dirname, "src/backend"),
      "@frontend": path.resolve(__dirname, "src/frontend"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
