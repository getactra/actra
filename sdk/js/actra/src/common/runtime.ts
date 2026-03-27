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

  //object-style (highest priority)
  if (args.length === 1 && typeof args[0] === "object") {
    return args[0]
  }

  //explicit fields
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

  return {}
}

// utils
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

// runtime class
export class ActraRuntime {

  private policy: Policy
  private actorResolver?: (ctx: any) => Actor
  private snapshotResolver?: (ctx: any) => Snapshot
  private events = new DecisionEmitter()

  constructor(policy: Policy) {
    this.policy = policy
  }

  // resolvers
  setActorResolver(resolver: (ctx: any) => Actor) {
    this.actorResolver = resolver
  }

  setSnapshotResolver(resolver: (ctx: any) => Snapshot) {
    this.snapshotResolver = resolver
  }

  setDecisionObserver(observer: DecisionObserver) {
    this.events.setDecisionObserver(observer)
  }

  private resolveSafe<T>(
    resolver: ((ctx: any) => T) | undefined,
    ctx: any
  ): T {
    if (!resolver) return {} as T

    try {
      return resolver(ctx) || {} as T
    } catch (err) {
      throw new ActraError(`Resolver failed: ${serializeError(err)}`)
    }
  }

  // core pipeline
  private processAction(
    actionName: string,
    args: any[],
    ctx: any,
    options?: {
      builder?: (
        actionType: string,
        kwargs: Record<string, any>,
        ctx?: any
      ) => Record<string, any>
      fields?: string[]
    }
  ): { action: Action; decision: Decision } {

    const schema = this.policy.getSchema()

    const kwargs = normalizeArgs(args, {
      fields: options?.fields,
      schema,
      actionName
    })

    const action = this.buildAction(actionName, kwargs, {
      builder: options?.builder,
      ctx,
      schema,
      fields: options?.fields
    })

    const decision = this.evaluate(action, ctx)

    return { action, decision }
  }

  // action builder
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

    // explicit fields
    if (options?.fields) {
      const allowed = new Set(options.fields)
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([k]) => allowed.has(k))
      )
    }

    // schema filter
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

  //evaluation
  evaluate(action: Action, ctx?: any): Decision {

    const actor = this.resolveSafe(this.actorResolver, ctx)
    const snapshot = this.resolveSafe(this.snapshotResolver, ctx)

    const start = Date.now()

    let decision: Decision
    try {
      decision = this.policy.evaluate({
        action,
        actor,
        snapshot
      })
    } catch (err) {
      throw new ActraPolicyError(
        `Policy evaluation failed: ${serializeError(err)}`
      )
    }

    const end = Date.now()

    try {
      if (this.events.hasDecisionObserver()) {
        this.events.emit({
          action,
          decision,
          context: { action, actor, snapshot },
          timestamp: end,
          durationMs: end - start
        })
      }
    } catch {
      // observability should never break execution
    }

    return decision
  }

  //helpers
  allow(actionName: string, args?: any, ctx?: any): boolean {
    const { decision } = this.processAction(actionName, [args], ctx)
    return decision.effect === "allow"
  }

  block(actionName: string, args?: any, ctx?: any): boolean {
    const { decision } = this.processAction(actionName, [args], ctx)
    return decision.effect === "block"
  }

  requiresApproval(actionName: string, args?: any, ctx?: any): boolean {
    const { decision } = this.processAction(actionName, [args], ctx)
    return decision.effect === "require_approval"
  }

  check(actionName: string, args?: any, ctx?: any): Decision {
    return this.processAction(actionName, [args], ctx).decision
  }

  //enforcement
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

    const runtime = this

    return async function (this: any, ...args: any[]) {

      const { decision } = runtime.processAction(
        actionName,
        args,
        this,
        options
      )

      if (decision.effect === "block") {
        throw new ActraPolicyError(
          `Action blocked (rule: ${decision.matched_rule || "unknown"})`,
          decision
        )
      }

      if (decision.effect === "require_approval") {
        throw new ActraPolicyError(
          `Action requires approval (rule: ${decision.matched_rule || "unknown"})`,
          decision
        )
      }

      return fn.apply(this, args)
    }
  }

  //audit (non-blocking)
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

      runtime.processAction(actionName, args, this, options)

      return fn.apply(this, args)
    }
  }

  //explain
  explain(action: Action, ctx?: any): Decision {

    const actor = this.resolveSafe(this.actorResolver, ctx)
    const snapshot = this.resolveSafe(this.snapshotResolver, ctx)

    return this.policy.explain({
      action,
      actor,
      snapshot
    })
  }

  explainCall(
    fn: (...args: any[]) => any,
    options: {
      args?: any[]
      actionName?: string
      ctx?: any
    } = {}
  ): Decision {

    const args = options.args || []
    const actionName = options.actionName || fn.name

    const schema = this.policy.getSchema()

    const kwargs = normalizeArgs(args, {
      schema,
      actionName
    })

    const action = this.buildAction(actionName, kwargs, {
      ctx: options.ctx,
      schema
    })

    return this.explain(action, options.ctx)
  }

  //manual action
  action(actionName: string, kwargs: Record<string, any>): Action {
    return this.buildAction(actionName, kwargs, {
      schema: this.policy.getSchema()
    })
  }
}
