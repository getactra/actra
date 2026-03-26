import { Actra, ActraRuntime } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:
  delete_cluster:
    fields:
      name: string
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
  - id: protect_prod_cluster
    scope:
      action: delete_cluster
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
// 4. Runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

runtime.setActorResolver(() => ({ role: "admin" }));

// ------------------------------------------------------------
// 5. Use block()
// ------------------------------------------------------------

console.log("\n--- Attempting staging deletion ---");

if (
  runtime.block("delete_cluster", {
    name: "search-cluster",
    env: "staging"
  })
) {
  console.log("Deletion blocked");
} else {
  console.log("Cluster deleted");
}

console.log("\n--- Attempting production deletion ---");

if (
  runtime.block("delete_cluster", {
    name: "prod-cluster",
    env: "prod"
  })
) {
  console.log("Deletion blocked by policy");
} else {
  console.log("Cluster deleted");
}