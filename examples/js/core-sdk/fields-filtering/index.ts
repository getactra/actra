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
  - id: block_large_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
`;

// ------------------------------------------------------------
// 3. Compile policy and create runtime
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

runtime.setActorResolver(() => ({ role: "support" }));
runtime.setSnapshotResolver(() => ({ fraud_flag: false }));

// ------------------------------------------------------------
// 4. Protect function with field filtering
// ------------------------------------------------------------
function refund(amount: number, currency: string) {
  console.log(`Refund executed: ${amount} ${currency}`);
}

//Only "amount" is passed to policy
const protectedRefund = runtime.admit(
  "refund",
  refund,
  {
    fields: ["amount"]
  }
);

// ------------------------------------------------------------
// 5. Calls
// ------------------------------------------------------------
async function run() {

  console.log("\nAllowed call");
  await protectedRefund(200, "USD");

  console.log("\nBlocked call");

  try {
    await protectedRefund(1500, "USD");
  } catch (e) {
    if (e instanceof ActraPolicyError) {
      console.log("Refund blocked by policy");
      console.log("Rule:", e.matchedRule);
    } else {
      throw e;
    }
  }
}

run().catch((err) => {
  console.error("\nExample failed");
  console.error(err);
  process.exit(1);
});