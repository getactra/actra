import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:

  issue_refund:
    fields:
      amount: number
      currency: string

  delete_user:
    fields:
      user_id: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    daily_refund_total: number
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: ai_refund_limit
    scope:
      action: issue_refund
    when:
      all:
        - subject:
            domain: actor
            field: agent_type
          operator: equals
          value:
            literal: "ai"

        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 500
    effect: block

  - id: restrict_user_deletion
    scope:
      action: delete_user
    when:
      subject:
        domain: actor
        field: role
      operator: not_equals
      value:
        literal: "supervisor"
    effect: block
`;

// ------------------------------------------------------------
// 3. Compile policy
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Context
// ------------------------------------------------------------
class AgentContext {
  role: string;
  agent_type: string;

  constructor(role: string, agent_type: string) {
    this.role = role;
    this.agent_type = agent_type;
  }
}

// ------------------------------------------------------------
// 5. Resolvers
// ------------------------------------------------------------
runtime.setActorResolver((ctx: AgentContext) => ({
  role: ctx.role,
  agent_type: ctx.agent_type
}));

runtime.setSnapshotResolver(() => ({
  daily_refund_total: 1200
}));

// ------------------------------------------------------------
// 6. Tools (functions)
// ------------------------------------------------------------
function refund(amount: number, currency: string) {
  console.log(`Issuing refund: ${amount} ${currency}`);
}

function deleteUser(user_id: string) {
  console.log(`Deleting user ${user_id}`);
}

// ------------------------------------------------------------
// 7. Protect tools
// ------------------------------------------------------------
const protectedRefund = runtime.admit(
  "issue_refund",
  refund
  // no fields needed → schema auto-maps ["amount","currency"]
);

const protectedDeleteUser = runtime.admit(
  "delete_user",
  deleteUser
);

// ------------------------------------------------------------
// 8. Contexts
// ------------------------------------------------------------
const aiAgent = new AgentContext("assistant", "ai");
const supervisor = new AgentContext("supervisor", "human");

// ------------------------------------------------------------
// 9. Allowed operation
// ------------------------------------------------------------
await protectedRefund.call(aiAgent, 200, "USD");

// ------------------------------------------------------------
// 10. Blocked AI refund
// ------------------------------------------------------------
try {
  await protectedRefund.call(aiAgent, 1000, "USD");
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("AI agent cannot issue large refunds");
  } else {
    throw e;
  }
}

// ------------------------------------------------------------
// 11. Blocked user deletion
// ------------------------------------------------------------
try {
  await protectedDeleteUser.call(aiAgent, "user_123");
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Only supervisors can delete users");
  } else {
    throw e;
  }
}

// ------------------------------------------------------------
// 12. Allowed supervisor action
// ------------------------------------------------------------
await protectedDeleteUser.call(supervisor, "user_123");

// ------------------------------------------------------------
// 13. Debug a decision (manual explain)
// ------------------------------------------------------------
console.log("\nExplain refund decision");

runtime.explainCall(refund, {
  args: [800, "USD"],
  actionName: "issue_refund",
  ctx: aiAgent
});