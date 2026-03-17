export class ActraError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActraError"
  }
}

export class ActraPolicyError extends ActraError {
  matchedRule?: string

  constructor(message: string, matchedRule?: string) {
    super(message)
    this.name = "ActraPolicyError"
    this.matchedRule = matchedRule
  }
}
