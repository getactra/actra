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
// 2. Policy A — support users
// ------------------------------------------------------------
const supportPolicyYaml = `
version: 1

rules:
  - id: support_limit
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
// 3. Policy B — admin users
// ------------------------------------------------------------
const adminPolicyYaml = `
version: 1

rules:
  - id: admin_limit
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 10000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "admin"
    effect: block
`;

// ------------------------------------------------------------
// 4. Compile policies
// ------------------------------------------------------------
const supportPolicy = await Actra.fromStrings(schemaYaml, supportPolicyYaml);
const adminPolicy = await Actra.fromStrings(schemaYaml, adminPolicyYaml);

// ------------------------------------------------------------
// 5. Create runtimes
// ------------------------------------------------------------
const supportRuntime = new ActraRuntime(supportPolicy);
const adminRuntime = new ActraRuntime(adminPolicy);

supportRuntime.setActorResolver(() => ({ role: "support" }));
supportRuntime.setSnapshotResolver(() => ({ fraud_flag: false }));

adminRuntime.setActorResolver(() => ({ role: "admin" }));
adminRuntime.setSnapshotResolver(() => ({ fraud_flag: false }));

// ------------------------------------------------------------
// 6. Base functions
// ------------------------------------------------------------
function supportRefund(amount: number) {
  console.log(`Support refund executed: ${amount}`);
  return amount;
}

function adminRefund(amount: number) {
  console.log(`Admin refund executed: ${amount}`);
  return amount;
}

// ------------------------------------------------------------
// 7. Protect functions (map to same action: "refund")
// ------------------------------------------------------------
const protectedSupportRefund = supportRuntime.admit(
  "refund",               //action type override
  supportRefund,
  { fields: ["amount"] }
);

const protectedAdminRefund = adminRuntime.admit(
  "refund",
  adminRefund,
  { fields: ["amount"] }
);

// ------------------------------------------------------------
// 8. Calls
// ------------------------------------------------------------
async function run() {

  console.log("\nSupport runtime");

  await protectedSupportRefund(200);

  try {
    await protectedSupportRefund(5000);
  } catch (e) {
    if (e instanceof ActraPolicyError) {
      console.log("Support refund blocked");
      console.log("Rule:", e.matchedRule);
    } else {
      throw e;
    }
  }

  console.log("\nAdmin runtime");

  await protectedAdminRefund(5000);

  try {
    await protectedAdminRefund(20000);
  } catch (e) {
    if (e instanceof ActraPolicyError) {
      console.log("Admin refund blocked");
      console.log("Rule:", e.matched_rule);
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