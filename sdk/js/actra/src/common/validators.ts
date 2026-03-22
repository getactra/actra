import { ActraError } from "./errors"
import { EvaluationInput } from "./types"

function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null
}

export function validateEvaluationInput(
  input: EvaluationInput
) {

  if (!input) {
    throw new ActraError("evaluation input missing")
  }

  if (!isObject(input.action)) {
    throw new ActraError("action must be an object")
  }

  if (!isObject(input.actor)) {
    throw new ActraError("actor must be an object")
  }

  if (!isObject(input.snapshot)) {
    throw new ActraError("snapshot must be an object")
  }
}
