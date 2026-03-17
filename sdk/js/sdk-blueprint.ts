// v1
// Types
export type Action = Record<string, any>;
export type Actor = Record<string, any>;
export type Snapshot = Record<string, any>;
export type Decision = Record<string, any>;
export type Context = any;
export type EvaluationContext = Record<string, any>;
export type ActionInput = { action: Action; actor: Actor; snapshot: Snapshot };

// Resolver Types
export type ActionBuilder = (actionType: string, args: any[], kwargs: Record<string, any>, ctx?: Context) => Action;
export type ActorResolver = (ctx?: Context) => Actor;
export type SnapshotResolver = (ctx?: Context) => Snapshot;
export type ActionResolver = (actionType: string, args: any[], kwargs: Record<string, any>, ctx?: Context) => Action;
export type ContextResolver = (args: any[], kwargs: Record<string, any>) => Context;
export type ActionTypeResolver = (func: Function, args: any[], kwargs: Record<string, any>) => string;

// Errors
export class ActraError extends Error {}
export class ActraPolicyError extends ActraError {
  decision: Decision;
  context: EvaluationContext;
  matchedRule?: string;
  constructor(actionType: string, decision: Decision, context: EvaluationContext) {
    super(`Actra policy blocked action '${actionType}'`);
    this.decision = decision;
    this.context = context;
    this.matchedRule = decision["matched_rule"];
  }
  toDict(): Record<string, any> {
    return { action: this.decision["action"], decision: this.decision, context: this.context };
  }
}
export class ActraSchemaError extends ActraError {}

// Decision Event
export class DecisionEvent {
  action: Action;
  decision: Decision;
  context: EvaluationContext;
  timestamp: Date;
  durationMs: number;

  constructor(action: Action, decision: Decision, context: EvaluationContext, durationMs = 0) {
    this.action = action;
    this.decision = decision;
    this.context = context;
    this.timestamp = new Date();
    this.durationMs = durationMs;
  }

  get effect(): string {
    return this.decision["effect"];
  }

  get matched_rule(): string | undefined {
    return this.decision["matched_rule"];
  }

  get is_blocked(): boolean {
    return this.effect === "block";
  }

  get action_type(): string {
    return this.action["type"] || "unknown";
  }
}

// Policy
export class Policy {
  evaluate(context: ActionInput): Decision { return {}; }
  evaluateAction(action: Action, actor: Actor, snapshot: Snapshot): Decision { return {}; }
  explain(context: ActionInput): Decision { return {}; }
  policyHash(): string { return ""; }
  assertEffect(context: ActionInput, expected: string): Decision { return {}; }
}

// Actra Loader
export class Actra {
  static fromStrings(schemaYaml: string, policyYaml: string, governanceYaml?: string): Policy { return new Policy(); }
  static fromFiles(schemaPath: string, policyPath: string, governancePath?: string): Policy { return new Policy(); }
  static fromDirectory(directory: string): Policy { return new Policy(); }
  static compilerVersion(): string { return "0.0.0"; }
}

// Runtime
export class ActraRuntime {
  policy: Policy;
  setActorResolver(fn: ActorResolver): void {}
  setSnapshotResolver(fn: SnapshotResolver): void {}
  setActionResolver(fn: ActionResolver): void {}
  setContextResolver(fn: ContextResolver): void {}
  setActionTypeResolver(fn: ActionTypeResolver): void {}
  setDecisionObserver(fn: (event: DecisionEvent) => void): void {}

  resolveActor(ctx?: Context): Actor { return {}; }
  resolveSnapshot(ctx?: Context): Snapshot { return {}; }
  resolveContext(args: any[], kwargs: Record<string, any>): Context | undefined { return undefined; }
  resolveActionType(func: Function, args: any[], kwargs: Record<string, any>, actionType?: string): string { return ""; }

  allow(actionType: string, ctx?: Context, fields?: Record<string, any>): boolean { return true; }
  block(actionType: string, ctx?: Context, fields?: Record<string, any>): boolean { return false; }
  action(actionType: string, fields?: Record<string, any>): Action { return { type: actionType }; }
  buildAction(actionType: string, args: any[], kwargs: Record<string, any>, ctx?: Context, fields?: string[]): Action { return { type: actionType }; }
  buildContext(action: Action, ctx?: Context): EvaluationContext { return {}; }

  evaluate(action: Action, ctx?: Context): Decision { return {}; }
  explain(action: Action, ctx?: Context): Decision { return {}; }
  explainCall(func: Function, args: any[], actionType?: string, ctx?: Context, kwargs?: Record<string, any>): Decision { return {}; }

  admit(actionType?: string, fields?: string[], actionBuilder?: ActionBuilder): Function { return (f: Function) => f; }
  audit(actionType?: string, fields?: string[], actionBuilder?: ActionBuilder): Function { return (f: Function) => f; }
}

// Aliases
export const loadPolicyFromFile = Actra.fromFiles;
export const loadPolicyFromString = Actra.fromStrings;
export const compiler_version = Actra.compilerVersion;
export const __version__ = "0.0.0";