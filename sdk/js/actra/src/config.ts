//all internal config related exports are here from SDK

import { ActraWasm } from "./actra-wasm"
import type { WasmInput } from "./loader/types"

export type ActraWasmSource = WasmInput

export function setWasmSource(source: ActraWasmSource) {
  ActraWasm.wasmSource = source
}