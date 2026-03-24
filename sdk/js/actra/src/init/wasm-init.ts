import { setInitPromise, registerEngine } from "../common/engine"
import { ActraWasm } from "../actra-wasm"
import { WasmCompiler } from "../wasm-compiler"
import { ActraError } from "../common/errors"

let initPromise: Promise<void> | null = null

function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await ActraWasm.load()
      const compiler = new WasmCompiler(wasm)

      // make registerEngine idempotent instead of try/catch string matching
      registerEngine(compiler)
    })().catch((err) => {
      // allow retry if init fails
      initPromise = null

      if (err instanceof ActraError) {
        throw err
      }

      throw new ActraError(
        `Actra initialization failed: ${err?.message || err}`
      )
    })
  }

  return initPromise
}

export function initWasm() {
  setInitPromise(init)
}