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
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: large_refund_requires_approval
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: require_approval
`;

// ------------------------------------------------------------
// 3. Compile
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

runtime.setActorResolver(() => ({ role: "support" }));

// ------------------------------------------------------------
// 4. Function
// ------------------------------------------------------------
function refund(amount: number) {
  console.log(`Refund executed: ${amount}`);
}

// ------------------------------------------------------------
// 5. Protect function
// ------------------------------------------------------------
const protectedRefund = runtime.admit("refund", refund);

// ------------------------------------------------------------
// 6. Usage
// ------------------------------------------------------------

console.log("\n--- Normal refund ---");

if (runtime.allow("refund", { amount: 200 })) {
  await protectedRefund(200);
}

console.log("\n--- Requires approval ---");

const amount = 2000;

if (runtime.requiresApproval("refund", { amount })) {
  console.log(`Refund of ${amount} requires approval`);
}

console.log("\n--- Direct execution (blocked) ---");

try {
  await protectedRefund(2000);
} catch (e: any) {
  if (e instanceof ActraPolicyError) {
    if (e.matchedRule === "require_approval") {
      console.log("Blocked: approval required");
      console.log("Rule:", e.matchedRule);
    } else {
      console.log("Blocked by policy");
    }
  }
}