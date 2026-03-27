/*
AI agent can:
- issue refunds
- delete users

Actra ensures:
- AI cannot issue large refunds
- only supervisors can delete users
- risky actions require approval

*/

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

  # AI cannot issue refunds above 500
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
            literal: ai

        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 500
    effect: block


  # Large refunds require approval
  - id: require_approval_large_refund
    scope:
      action: issue_refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 300
    effect: require_approval


  # Only supervisors can delete users
  - id: restrict_delete_user
    scope:
      action: delete_user
    when:
      subject:
        domain: actor
        field: role
      operator: not_equals
      value:
        literal: supervisor
    effect: block
`;

// ------------------------------------------------------------
// 3. Setup
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Context
// ------------------------------------------------------------
class AgentContext {
  constructor(public role: string, public agent_type: string) {}
}

runtime.setActorResolver((ctx: AgentContext) => ({
  role: ctx.role,
  agent_type: ctx.agent_type
}));

runtime.setSnapshotResolver(() => ({
  daily_refund_total: 1200
}));

// ------------------------------------------------------------
// 5. Tools (business logic)
// ------------------------------------------------------------
function refund(amount: number, currency: string) {
  console.log(`Refund executed: ${amount} ${currency}`);
}

function deleteUser(user_id: string) {
  console.log(`User deleted: ${user_id}`);
}

// ------------------------------------------------------------
// 6. Protect tools with Actra
// ------------------------------------------------------------
const protectedRefund = runtime.admit("issue_refund", refund);
const protectedDeleteUser = runtime.admit("delete_user", deleteUser);

// ------------------------------------------------------------
// 7. Simulated AI Agent
// ------------------------------------------------------------
async function runAgent() {

  const ai = new AgentContext("assistant", "ai");
  const supervisor = new AgentContext("supervisor", "human");

  console.log("\n--- AI small refund (allowed) ---");
  await protectedRefund.call(ai, 100, "USD");

  console.log("\n--- AI medium refund (requires approval) ---");
  try {
    await protectedRefund.call(ai, 400, "USD");
  } catch (e: any) {
    if (e instanceof ActraPolicyError && e.decision?.effect === "require_approval") {
      console.log("Requires approval:", e.decision.matched_rule);
    }
  }

  console.log("\n--- AI large refund (blocked) ---");
  try {
    await protectedRefund.call(ai, 1000, "USD");
  } catch (e: any) {
    if (e instanceof ActraPolicyError) {
      console.log("Blocked:", e.decision?.matched_rule);
    }
  }

  console.log("\n--- AI delete user (blocked) ---");
  try {
    await protectedDeleteUser.call(ai, "user_123");
  } catch (e: any) {
    if (e instanceof ActraPolicyError) {
      console.log("Blocked:", e.decision?.matched_rule);
    }
  }

  console.log("\n--- Supervisor delete user (allowed) ---");
  await protectedDeleteUser.call(supervisor, "user_123");
}

// ------------------------------------------------------------
// Run
// ------------------------------------------------------------
runAgent();