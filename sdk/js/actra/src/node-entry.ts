import { initWasm } from "./init/wasm-init"
// export node actra
export { ActraNode as Actra } from "./node/actra-node"

// SDK exports
export { Policy } from "./common/policy"
export {ActraRuntime} from "./common/runtime"
export {ActraError, ActraPolicyError} from "./common/errors"

export type {
  Action,
  Actor,
  Snapshot,
  Decision,
  DecisionEvent,
  EvaluationInput,
  JSONValue
} from "./common/types"

export type { DecisionObserver } from "./common/events"
export { setWasmSource } from "./config" //used for wasm source if external CDN, Streaming, ArrayBuffer etc
export type { ActraWasmSource } from "./config"

import { setWasmLoader } from "./loader/loader-registry"
import { loadActraWasm } from "./loader/node-loader"

setWasmLoader(loadActraWasm)

initWasm() //exec by ensureEngineReady lazy load
