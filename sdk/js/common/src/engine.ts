import { EvaluationInput, Decision } from "./types"

let initPromise: Promise<void> | null = null

export function setInitPromise(promise: Promise<void>) {
  initPromise = promise
}

export async function ensureEngineReady() {
  if (initPromise) {
    await initPromise
  }
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
    throw new Error("Invalid Actra engine")
  }

  if (registeredEngine === engineImpl) {
    return // idempotent
  }

  if (registeredEngine) {
    throw new Error("Actra engine already initialized")
  }

  registeredEngine = engineImpl
}

export function getEngine(): NativeCompiler {
  if (!registeredEngine) {
    throw new Error(
      "Actra engine not initialized. Call initializeWasmEngine() first."
    )
  }
  return registeredEngine
}