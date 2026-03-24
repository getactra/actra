import { ActraError } from "./errors"
import { EvaluationInput, Decision } from "./types"

let initPromise: Promise<void> | null = null
let initPromiseFn: (() => Promise<void>) | null = null

export function setInitPromise(fn: () => Promise<void>) {
  initPromiseFn = fn
}

export async function ensureEngineReady() {
  if (!initPromiseFn) {
    throw new ActraError("Actra engine not initialized")
  }

  if (!initPromise) {
    initPromise = initPromiseFn().catch(err => {
      initPromise = null // allow retry if init fails
      throw err
    })
  }

  return initPromise
}

export interface NativePolicy {
  evaluate(input: EvaluationInput): Decision
  policyHash(): string
}

export interface NativeCompiler {
  compile(
    schema: string,
    policy: string,
    governance?: string
  ): NativePolicy

  compilerVersion(): string
}

let registeredEngine: NativeCompiler | null = null

export function registerEngine(engineImpl: NativeCompiler) {
  if (!engineImpl) {
    throw new ActraError("Invalid Actra engine")
  }

  if (registeredEngine === engineImpl) {
    return // idempotent
  }

  if (registeredEngine) {
    throw new ActraError("Actra engine already initialized")
  }

  registeredEngine = engineImpl
}

export function getEngine(): NativeCompiler {
  if (!registeredEngine) {
    throw new ActraError(
      "Actra engine not initialized"
    )
  }
  return registeredEngine
}