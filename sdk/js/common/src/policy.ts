import { EvaluationInput, Decision } from "./types"
import { validateEvaluationInput } from "./validators"
import { NativePolicy } from "./engine"

export class Policy {

  private nativePolicy: NativePolicy

  constructor(policyImpl: NativePolicy) {

    if (!policyImpl) {
      throw new Error("Invalid native policy instance")
    }

    this.nativePolicy = policyImpl
  }

  evaluate(input: EvaluationInput): Decision {

    validateEvaluationInput(input)

    try {
      return this.nativePolicy.evaluate(input)
    } catch (err) {
      throw new Error(
        `Actra policy evaluation failed: ${err}`
      )
    }
  }

  policyHash(): string {

    try {
      return this.nativePolicy.policyHash()
    } catch (err) {
      throw new Error(
        `Failed to retrieve policy hash: ${err}`
      )
    }
  }
}
