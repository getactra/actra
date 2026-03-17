export type Scalar =
  | string
  | number
  | boolean
  | null

export type DecisionEffect =
  | "allow"
  | "block"
  | "require_approval"

export type Action = {
  action: string
} & Record<string, Scalar>

export type Actor = Record<string, Scalar>

export type Snapshot = Record<string, Scalar>

export interface EvaluationInput {
  action: Action
  actor: Actor
  snapshot: Snapshot
}

export interface Decision {
  effect: DecisionEffect
  matched_rule?: string

  // Future extension point
  // required_actions?:  Record<string, unknown>[]
}

export interface DecisionEvent {
  action: Action
  decision: Decision
  context: EvaluationInput
  timestamp: number
  durationMs: number
}
