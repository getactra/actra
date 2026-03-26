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
// 3. Compile policy
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Register resolvers
// ------------------------------------------------------------
runtime.setActorResolver(() => ({ role: "support" }));
runtime.setSnapshotResolver(() => ({ fraud_flag: false }));

// ------------------------------------------------------------
// 5. Custom action builder
// ------------------------------------------------------------
function buildRefundAction(
  actionType: string,
  kwargs: Record<string, any>,
  ctx?: any
) {
  return {
    amount: kwargs.amount
  };
}

// ------------------------------------------------------------
// 6. Protect function using custom builder
// ------------------------------------------------------------
function refund(amount: number, currency: string) {
  console.log(`Refund executed: ${amount} ${currency}`);
}

//builder passed via options
const protectedRefund = runtime.admit(
  "refund",
  refund,
  {
    builder: buildRefundAction
  }
);

// ------------------------------------------------------------
// 7. Calls
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

      // matches runtime decision field
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