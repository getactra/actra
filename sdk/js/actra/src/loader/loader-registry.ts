import type { WasmInput } from "./types"
import type { ActraWasmModule } from "./types"

type Loader = (input: WasmInput) => Promise<ActraWasmModule>

let loader: Loader | null = null

export function setWasmLoader(fn: Loader) {
  loader = fn
}

export function getWasmLoader(): Loader {
  if (!loader) {
    throw new Error("WASM loader not initialized")
  }
  return loader
}