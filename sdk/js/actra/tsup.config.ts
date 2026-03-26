import { defineConfig } from "tsup";

export default defineConfig([
  // core
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    target: "es2022",
    platform: "neutral",
  },

  // node build
  {
    entry: ["src/node-entry.ts"],
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: false,
    target: "es2022",
    platform: "node",
  },

  // browser, edge build
  {
    entry: ["src/browser-entry.ts"],
    format: ["esm"],
    splitting: false,
    sourcemap: false,
    target: "es2022",
    platform: "browser",
  },
]);
