import { loadActraWasmShared } from "./shared";
import type { WasmInput, ActraWasmModule } from "./types";

export function loadActraWasm(input: WasmInput): Promise<ActraWasmModule> {
  if (typeof fetch !== "function") {
    throw new Error("Fetch API not available in this environment");
  }

  return loadActraWasmShared(input, {
    fetch: globalThis.fetch
  });
}