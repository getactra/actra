import { Actra, ActraRuntime } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:
  deploy:
    fields:
      env: string

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
  - id: block_prod
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
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Decision observer
// ------------------------------------------------------------
runtime.setDecisionObserver((event) => {
  console.log("Decision:", event.decision.effect);
});

// ------------------------------------------------------------
// 5. Build action manually
// ------------------------------------------------------------
const action = runtime.action("deploy", {
  env: "prod"
});

// ------------------------------------------------------------
// 6. Evaluate
// ------------------------------------------------------------
const decision = runtime.evaluate(action);

console.log("Final decision:", decision);