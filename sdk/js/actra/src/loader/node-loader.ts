import { loadActraWasmShared } from "./shared";

export function loadActraWasm(input) {
  return loadActraWasmShared(input, {
    fetch: (input) => fetch(input),

    readFile: async (input) => {
      const [fs, url] = await Promise.all([
        import("fs/promises"),
        import("url")
      ]);

      const filePath =
        input instanceof URL ? url.fileURLToPath(input) : input;

      return fs.readFile(filePath);
    }
  });
}