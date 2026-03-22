import { ActraError} from "./common/errors"
import {NativeCompiler, NativePolicy} from "./common/engine"
import {Decision, DecisionEffect, isDecisionEffect} from "./common/types";
import { ActraWasm } from "./actra-wasm";

// internal types
type WasmDecision = {
  effect: string;
  matched_rule: string | null;
};

// helpers
function normalizeEffect(effect: string): DecisionEffect {
  if (isDecisionEffect(effect)) {
    return effect;
  }

  throw new ActraError(`Invalid decision effect: ${effect}`);
}

function toDecision(res: WasmDecision): Decision {
  return {
    effect: normalizeEffect(res.effect),
    matched_rule: res.matched_rule ?? ""
  };
}

//compiler
export class WasmCompiler implements NativeCompiler {
  constructor(private wasm: ActraWasm) { }

  compile(
    schema: string,
    policy: string,
    governance?: string
  ): NativePolicy {

    let instanceId: number;

    try {
      instanceId = this.wasm.create(schema, policy, governance);
    } catch (err) {
      if (err instanceof ActraError) {
        throw new ActraError(
          `Actra runtime engine: policy compile failed: ${err.message}`
        );
      }

      throw new ActraError(
        `Actra runtime engine: policy compile failed: ${String(err)}`
      );
    }

    const wasm = this.wasm;

    const nativePolicy: NativePolicy & { free?: () => void } = {
      evaluate(input): Decision {
        if (input == null) {
          throw new ActraError("Evaluation input cannot be null or undefined");
        }
        const res = wasm.evaluate(instanceId, input);
        return toDecision(res);
      },

      policyHash(): string {
        return wasm.policyHash(instanceId);
      },

      // IMPORTANT: call free() when policy no longer needed
      free() {
        wasm.free(instanceId);
      }
    };

    return nativePolicy;
  }

  compilerVersion(): string {
    return this.wasm.compilerVersion();
  }
}