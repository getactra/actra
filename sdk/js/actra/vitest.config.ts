import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@actra/common": path.resolve(__dirname, "../common/src")
    }
  }
});