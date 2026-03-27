import { Actra, ActraRuntime } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:
  scale_service:
    fields:
      service: string
      replicas: number

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
  - id: block_large_scale
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        literal: 10
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

runtime.setActorResolver(() => ({ role: "operator" }));

// ------------------------------------------------------------
// 5. Use allow()
// ------------------------------------------------------------

console.log("\n--- Allowed scaling ---");

if (
  runtime.allow("scale_service", {
    service: "search",
    replicas: 5
  })
) {
  console.log("Scaling service to 5 replicas");
}

console.log("\n--- Blocked scaling ---");

if (
  !runtime.allow("scale_service", {
    service: "search",
    replicas: 20
  })
) {
  console.log("Scaling request denied by policy");
}