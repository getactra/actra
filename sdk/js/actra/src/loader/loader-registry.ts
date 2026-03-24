import type { WasmInput } from "./types"
import type { ActraWasmModule } from "./types"
import { ActraError } from "../common/errors"

type Loader = (input: WasmInput) => Promise<ActraWasmModule>

let loader: Loader | null = null

export function setWasmLoader(fn: Loader) {
  if (!fn) {
    throw new ActraError("Invalid WASM loader")
  }

  if (loader === fn) {
    return // idempotent
  }

  if (loader) {
    throw new Error("WASM loader already initialized")
  }

  loader = fn
}

export function getWasmLoader(): Loader {
  if (!loader) {
    throw new ActraError(
      "Actra WASM loader not initialized. Ensure correct environment entry is used."
    )
  }

  return loader
}

export function hasWasmLoader(): boolean {
  return loader !== null
}