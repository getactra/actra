import { EvaluationInput } from "./types"

function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null
}

export function validateEvaluationInput(
  input: EvaluationInput
) {

  if (!input) {
    throw new Error("evaluation input missing")
  }

  if (!isObject(input.action)) {
    throw new Error("action must be an object")
  }

  if (!isObject(input.actor)) {
    throw new Error("actor must be an object")
  }

  if (!isObject(input.snapshot)) {
    throw new Error("snapshot must be an object")
  }
}
