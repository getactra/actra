import { loadActraWasmShared } from "./shared";
import type { WasmInput, ActraWasmModule } from "./types";

export function loadActraWasm(
  input: WasmInput
): Promise<ActraWasmModule> {

  return loadActraWasmShared(input, {
    fetch: globalThis.fetch,

    readFile: async (input) => {
      const [fs, url] = await Promise.all([
        import("node:fs/promises"),
        import("node:url")
      ]);

      const filePath =
        input instanceof URL
          ? url.fileURLToPath(input)
          : String(input);

      return fs.readFile(filePath);
    }
  });
}