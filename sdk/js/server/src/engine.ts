import { registerEngine, NativeCompiler, NativePolicy } from "@actra/common"
import { EvaluationInput, Decision } from "@actra/common"
import { loadActraWasm } from "./wasm-loader"

let initPromise: Promise<void> | null = null

export function initializeWasmEngine(): Promise<void> {

    if (initPromise) {
        return initPromise
    }

    initPromise = (async () => {
        const wasm = await loadActraWasm()
        if (!wasm?.Actra) {
            throw new Error("Invalid Actra WASM module")
        }
        const compiler: NativeCompiler = {
            compile(
                schema: string,
                policy: string,
                governance?: string
            ): NativePolicy {
                const instance = new wasm.Actra(schema, policy, governance)

                return {
                    evaluate(input: EvaluationInput): Decision {
                        try{
                        return instance.evaluate(input)
                        } catch (err) {
                            throw new Error (`Actra Evaluation failed: ${err}`)     
                        }
                    },

                    policyHash(): string {
                        return instance.policy_hash()
                    }
                }
            },

            compilerVersion(): string {
                return wasm.Actra.compiler_version()
            }

        }
        registerEngine(compiler)
    })()

    return initPromise
}