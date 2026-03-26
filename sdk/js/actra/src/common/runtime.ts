import { Policy } from "./policy"
import {
  Actor,
  Snapshot,
  Action,
  Decision
} from "./types"
import { ActraError, ActraPolicyError } from "./errors"
import { DecisionEmitter, DecisionObserver } from "./events"

function normalizeArgs(
  args: any[],
  options?: { fields?: string[]; schema?: any; actionName?: string }
): Record<string, any> {

  //explicit fields (highest priority)
  if (options?.fields) {
    const result: Record<string, any> = {}

    for (let i = 0; i < options.fields.length; i++) {
      result[options.fields[i]] = args[i]
    }

    return result
  }

  //schema-driven mapping
  if (options?.schema && options?.actionName) {
    const actionSchema = options.schema.actions?.[options.actionName]

    if (actionSchema?.fields) {
      const fieldNames = Object.keys(actionSchema.fields)

      const result: Record<string, any> = {}

      for (let i = 0; i < fieldNames.length; i++) {
        result[fieldNames[i]] = args[i]
      }

      return result
    }
  }

  //object-style input
  if (args.length === 1 && typeof args[0] === "object") {
    return args[0]
  }

  //fallback
  return {}
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

  buildAction(
    actionName: string,
    kwargs: Record<string, any>,
    options?: {
      builder?: (
        actionType: string,
        kwargs: Record<string, any>,
        ctx?: any
      ) => Record<string, any>
      ctx?: any
      schema?: any
      fields?: string[]
    }
  ): Action {

    const base: Action = { type: actionName }

    //builder override
    if (options?.builder) {
      try {
        return {
          ...base,
          ...options.builder(actionName, kwargs, options.ctx)
        }
      } catch (err) {
        throw new ActraError(`Action builder failed: ${serializeError(err)}`)
      }
    }

    let filtered = { ...kwargs }

    // explicit fields filtering
    if (options?.fields) {
      const allowed = new Set(options.fields)

      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([k]) => allowed.has(k))
      )
    }

    // schema filtering
    if (options?.schema?.actions?.[actionName]?.fields) {
      const schemaFields = new Set(
        Object.keys(options.schema.actions[actionName].fields)
      )

      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([k]) => schemaFields.has(k))
      )
    }

    return {
      ...base,
      ...filtered
    }
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
      throw new ActraPolicyError(`Policy evaluation failed: ${serializeError(err)}`)
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

    const action = this.buildAction(actionName, args || {}, { ctx })

    const decision = this.evaluate(action, ctx)

    return decision.effect === "allow"
  }

  block(
    actionName: string,
    args?: Record<string, any>,
    ctx?: any
  ): boolean {

    const action = this.buildAction(actionName, args || {}, { ctx })

    const decision = this.evaluate(action, ctx)

    return decision.effect === "block"
  }

  admit(
    actionName: string,
    fn: (...args: any[]) => any,
    options?: {
      builder?: (
        actionType: string,
        kwargs: Record<string, any>,
        ctx?: any
      ) => Record<string, any>
      fields?: string[]
    }
  ): Function {

    if (!actionName || typeof actionName !== "string") {
      throw new ActraError("Invalid action name")
    }

    const runtime = this

    return async function (this: any, ...args: any[]) {

      //normalize kwargs
      const kwargs = normalizeArgs(args, {
        fields: options?.fields,
        schema: runtime.policy.getSchema(),
        actionName: actionName
      })

      //build action, py like
      const action = runtime.buildAction(actionName, kwargs, {
        builder: options?.builder,
        ctx: this,
        schema: runtime.policy.getSchema()
      })

      const decision = runtime.evaluate(action, this)

      if (decision.effect !== "allow") {
        throw new ActraPolicyError(
          `Action blocked (rule: ${decision.matched_rule || "unknown"})`,
          decision
        )
      }

      return fn.apply(this, args)
    }
  }

  audit(
    actionName: string,
    fn: (...args: any[]) => any,
    options?: {
      builder?: (
        actionType: string,
        kwargs: Record<string, any>,
        ctx?: any
      ) => Record<string, any>
      fields?: string[]
    }
  ): Function {

    const runtime = this

    return async function (this: any, ...args: any[]) {

      const kwargs = normalizeArgs(args, options)

      const action = runtime.buildAction(actionName, kwargs, {
        builder: options?.builder,
        ctx: this,
        schema: runtime.policy.getSchema()
      })

      runtime.evaluate(action, this)

      return fn.apply(this, args)
    }
  }

  explain(action: Action, ctx?: any): Decision {

    const actor = this.resolveSafe(this.actorResolver, ctx, "Actor")
    const snapshot = this.resolveSafe(this.snapshotResolver, ctx, "Snapshot")

    const context = {
      action,
      actor,
      snapshot
    }

    return this.policy.explain(context)
  }

  explainCall(
    fn: (...args: any[]) => any,
    options: {
      args?: any[]
      actionName?: string
      ctx?: any
    } = {}
  ): Decision {

    const runtime = this

    const args = options.args || []

    const actionName =
      options.actionName ||
      fn.name

    const kwargs = normalizeArgs(args, {
      schema: runtime.policy.getSchema(),
      actionName
    })

    const action = runtime.buildAction(actionName, kwargs, {
      ctx: options.ctx
    })

    return runtime.explain(action, options.ctx)
  }

  action(actionName: string, kwargs: Record<string, any>): Action {
    return this.buildAction(actionName, kwargs, { ctx: undefined });
  }
}
