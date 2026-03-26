import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:
  refund:
    fields:
      amount: number

actor:
  fields:
    role: string

snapshot:
  fields:
    fraud_flag: boolean
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: block_large_refund_for_support
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 1000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "support"
    effect: block
`;

// ------------------------------------------------------------
// 3. Compile policy
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Example request context
// ------------------------------------------------------------
class RequestContext {
  role: string;
  fraud_flag: boolean;

  constructor(role: string, fraud_flag: boolean) {
    this.role = role;
    this.fraud_flag = fraud_flag;
  }
}

// ------------------------------------------------------------
// 5. Register resolvers
// ------------------------------------------------------------

// Actor resolver
runtime.setActorResolver((ctx) => ({
  role: ctx.role
}));

// Snapshot resolver
runtime.setSnapshotResolver((ctx) => ({
  fraud_flag: ctx.fraud_flag
}));

// ------------------------------------------------------------
// 6. Create runtime context
// ------------------------------------------------------------
const ctx = new RequestContext("support", false);

// ------------------------------------------------------------
// 7. Build action
// ------------------------------------------------------------
const action = runtime.buildAction(
  "refund",
  { amount: 2000 },
);

// ------------------------------------------------------------
// 8. Evaluate policy
// ------------------------------------------------------------
const decision = runtime.evaluate(action, ctx);

console.log("Decision:", decision);