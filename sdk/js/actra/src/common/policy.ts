import { EvaluationInput, Decision, DecisionEffect } from "./types"
import { validateEvaluationInput } from "./validators"
import { NativePolicy } from "./engine"
import { ActraPolicyError, serializeError } from "./errors"

export class Policy {

  private nativePolicy: NativePolicy

  constructor(
    policyImpl: NativePolicy,
    private schema?: any
  ) {

    if (!policyImpl) {
      throw new ActraPolicyError("Invalid native policy instance")
    }

    this.nativePolicy = policyImpl
  }

  getSchema(): any | undefined {
    return this.schema
  }

  hasSchema(): boolean {
    return !!this.schema
  }

  evaluate(input: EvaluationInput): Decision {

    validateEvaluationInput(input)

    try {
      return this.nativePolicy.evaluate(input)
    } catch (err) {
      throw new ActraPolicyError(
        `Actra policy evaluation failed: ${serializeError(err)}`
      )
    }
  }

  policyHash(): string {

    try {
      return this.nativePolicy.policyHash()
    } catch (err) {
      throw new ActraPolicyError(
        `Failed to retrieve policy hash: ${err}`
      )
    }
  }

  assertEffect(input: EvaluationInput, expected: DecisionEffect): Decision {

    const result = this.evaluate(input)
    const actual = result?.effect

    if (actual !== expected) {
      throw new ActraPolicyError(
        `Policy assertion failed.\n` +
        `Expected effect: ${expected}\n` +
        `Actual effect:   ${actual}\n` +
        `Context: ${JSON.stringify(input, null, 2)}`
      )
    }

    return result
  }

  evaluateAction(
    action: any,
    actor: any,
    snapshot: any
  ): Decision {

    return this.evaluate({
      action,
      actor,
      snapshot
    })
  }

  explain(input: EvaluationInput): Decision {

    const result = this.evaluate(input)

    console.log("\nActra Decision")
    console.log("--------------")

    for (const section of ["action", "actor", "snapshot"]) {
      console.log(`\n${section}:`)
      const data = (input as any)[section] || {}

      for (const key in data) {
        console.log(`  ${key}: ${data[key]}`)
      }
    }

    console.log("\nResult:")
    for (const key in result) {
      console.log(`  ${key}: ${(result as any)[key]}`)
    }

    return result
  }


}
