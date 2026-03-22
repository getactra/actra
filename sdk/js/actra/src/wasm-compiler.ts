import {
  ActraError,
  NativeCompiler,
  NativePolicy,
  Decision,
  DecisionEffect,
  isDecisionEffect
} from "@actra/common";
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
  constructor(private wasm: ActraWasm) {}

  compile(
    schema: string,
    policy: string,
    governance?: string
  ): NativePolicy {

    let instanceId: number;

    try {
      instanceId = this.wasm.create(schema, policy, governance);
    } catch (err) {
      throw new ActraError(`Actra runtime engine: policy compile failed: ${err}`);
    }

    const wasm = this.wasm;

    const nativePolicy: NativePolicy & { free?: () => void } = {
      evaluate(input): Decision {
        const res = wasm.evaluate(instanceId, input);
        return toDecision(res);
      },

      policyHash(): string {
        return wasm.policyHash(instanceId);
      },

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