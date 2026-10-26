import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a Next bundler marker (not an installed package); stub it so server modules
      // can be imported under vitest's plain-node runner.
      "server-only": path.resolve(__dirname, "__tests__/_stubs/server-only.ts"),
    },
  },
  test: {
    // Default stays node; component tests opt into jsdom via a `// @vitest-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    include: [
      "**/__tests__/**/*.test.ts",
      "**/__tests__/**/*.test.tsx",
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
    ],
  },
});
