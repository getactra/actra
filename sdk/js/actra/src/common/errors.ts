import { Decision } from "./types"

export class ActraError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActraError"
  }
}

export class ActraPolicyError extends ActraError {
  decision?: Decision

  constructor(message: string, decision?: Decision) {
    super(message)
    this.name = "ActraPolicyError"
    this.decision = decision
  }

  get matchedRule(): string | undefined {
    return this.decision?.matched_rule
  }
}
