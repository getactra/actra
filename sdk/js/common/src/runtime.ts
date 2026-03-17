import { Policy } from "./policy"
import {
  Actor,
  Snapshot,
  Action,
  Decision
} from "./types"
import { ActraError, ActraPolicyError } from "./errors"
import { DecisionEmitter, DecisionObserver } from "./events"

function buildAction(
  actionName: string,
  args: any[],
  builder?: (args: any[], ctx?: any) => Record<string, any>,
  ctx?: any
): Action {

  const base: Action = { action: actionName }

  if (!builder) {
    return base
  }

  let mapped: Record<string, any>

  try {
    mapped = builder(args, ctx)
  } catch (err) {
    throw new ActraError(`Action builder failed: ${serializeError(err)}`)
  }
  return {
    ...base,
    ...mapped
  }
}

function serializeError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`
  }

  try {
    return JSON.stringify(err, null, 2)
  } catch {
    return String(err)
  }
}

export class ActraRuntime {

  private policy: Policy
  private actorResolver?: (ctx: any) => Actor
  private snapshotResolver?: (ctx: any) => Snapshot
  private events = new DecisionEmitter()

  private resolveSafe<T>(
    resolver: ((ctx: any) => T) | undefined,
    ctx: any,
    label: string
  ): T {

    if (!resolver) {
      return {} as T
    }

    try {
      return resolver(ctx) || {} as T
    } catch (err) {
      throw new ActraError(`Resolver failed: ${serializeError(err)}`)
    }
  }

  constructor(policy: Policy) {
    this.policy = policy
  }

  setActorResolver(resolver: (ctx: any) => Actor) {
    this.actorResolver = resolver
  }

  setSnapshotResolver(resolver: (ctx: any) => Snapshot) {
    this.snapshotResolver = resolver
  }

  setDecisionObserver(observer: DecisionObserver) {
    this.events.setDecisionObserver(observer)
  }

  evaluate(action: Action, ctx?: any): Decision {

    const actor = this.resolveSafe(this.actorResolver, ctx, "Actor")
    const snapshot = this.resolveSafe(this.snapshotResolver, ctx, "Snapshot")

    const start = Date.now()
    let decision: Decision
    try {
      decision = this.policy.evaluate({
        action,
        actor,
        snapshot
      })
    } catch (err) {
      throw new ActraError(`Policy evaluation failed: ${serializeError(err)}`)
    }
    const end = Date.now()
    const duration = end - start

    try {
      if (this.events.hasDecisionObserver()) {
        this.events.emit({
          action,
          decision,
          context: { action, actor, snapshot },
          timestamp: end,
          durationMs: duration
        })
      }
    } catch {
      // observability should never break execution
    }

    return decision
  }

  allow(
    actionName: string,
    args?: Record<string, any>,
    ctx?: any
  ): boolean {

    const decision = this.evaluate(
      { action: actionName, ...(args || {}) },
      ctx
    )

    return decision.effect === "allow"
  }

  admit(
    actionName: string,
    fn: (...args: any[]) => any,
    builder?: (args: any[], ctx?: any) => Record<string, any>
  ): Function {

    if (!actionName || typeof actionName !== "string") {
      throw new ActraError("Invalid action name")
    }

    const runtime = this

    return async function (this: any, ...args: any[]) {

      const action = buildAction(actionName, args, builder, this)

      const decision = runtime.evaluate(action, this)

      if (decision.effect !== "allow") {
        throw new ActraPolicyError(
          "Action blocked",
          decision.matched_rule
        )
      }

      return fn.apply(this, args)
    }
  }

  audit(
    actionName: string,
    fn: (...args: any[]) => any,
    builder?: (args: any[], ctx?: any) => Record<string, any>
  ): Function {

    if (!actionName || typeof actionName !== "string") {
      throw new ActraError("Invalid action name")
    }

    const runtime = this

    return async function (this: any, ...args: any[]) {

      const action = buildAction(actionName, args, builder, this)

      runtime.evaluate(action, this)

      return fn.apply(this, args)
    }
  }
}

//Example 
//Simple Case
//runtime.admit("transfer", transferFunds)

//Argument mapping
//runtime.admit(
//  "transfer",
//  transferFunds,
//  (args) => ({
//    userId: args[0],
//    amount: args[1]
//  })
//)

//context-aware mapping
//runtime.admit(
//  "transfer",
//  transferFunds,
//  (args, ctx) => ({
//    userId: ctx.user.id,
//    amount: args[1]
//  })
//)