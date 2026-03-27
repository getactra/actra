import { Actra, ActraRuntime } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:
  deploy:
    fields:
      service: string
      env: string

actor:
  fields:
    role: string

snapshot:
  fields:
    maintenance_mode: boolean
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: block_prod_deploy
    scope:
      action: deploy
    when:
      subject:
        domain: action
        field: env
      operator: equals
      value:
        literal: "prod"
    effect: block
`;

// ------------------------------------------------------------
// 3. Compile policy
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);

// ------------------------------------------------------------
// 4. Create runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Register resolvers
// ------------------------------------------------------------
runtime.setActorResolver(() => ({ role: "devops" }));
runtime.setSnapshotResolver(() => ({ maintenance_mode: false }));

// ------------------------------------------------------------
// 6. Evaluate actions (no function, direct action construction)
// ------------------------------------------------------------

console.log("\n--- Allowed deployment ---");

const allowedDecision = runtime.evaluate(
  runtime.action("deploy", {
    service: "billing",
    env: "staging"
  })
);

console.log("Decision:", allowedDecision);

console.log("\n--- Blocked deployment ---");

const blockedDecision = runtime.evaluate(
  runtime.action("deploy", {
    service: "billing",
    env: "prod"
  })
);

console.log("Decision:", blockedDecision);