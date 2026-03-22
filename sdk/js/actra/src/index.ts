import { setInitPromise, registerEngine } from "@actra/common";
import { ActraWasm } from "./actra-wasm";
import { WasmCompiler } from "./wasm-compiler";

let initPromise: Promise<void> | null = null;

function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await ActraWasm.load();

      const compiler = new WasmCompiler(wasm);

      try {
        registerEngine(compiler);
      } catch (e) {
        // ignore if already registered
      }
    })();
  }

  return initPromise;
}

// Register init with common
setInitPromise(init());

// Re-export public API
export * from "@actra/common";