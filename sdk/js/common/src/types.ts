export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export const DECISION_EFFECTS = [
  "allow",
  "block",
  "require_approval"
] as const;

export type DecisionEffect = typeof DECISION_EFFECTS[number];

const EFFECT_SET = new Set<string>(DECISION_EFFECTS);

export function isDecisionEffect(
  value: string
): value is DecisionEffect {
  return EFFECT_SET.has(value);
}

export type Action = {
  type: string
} & Record<string, JSONValue>;

export type Actor = Record<string, JSONValue>;

export type Snapshot = Record<string, JSONValue>;

export interface EvaluationInput {
  action: Action;
  actor: Actor;
  snapshot: Snapshot;
}

export interface Decision {
  effect: DecisionEffect;
  matched_rule: string; // always present
  // Future extension point
  // required_actions?:  Record<string, unknown>[]
}

export interface DecisionEvent {
  action: Action;
  decision: Decision;
  context: EvaluationInput;
  timestamp: number; // epoch ms
  durationMs: number;
}