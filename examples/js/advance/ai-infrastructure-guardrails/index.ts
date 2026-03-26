import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

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
      environment: string

  deploy_service:
    fields:
      service: string
      version: string
      environment: string

  delete_service:
    fields:
      service: string
      environment: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    cluster_capacity: number
    production_freeze: boolean
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: block_ai_delete_prod
    scope:
      action: delete_service
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
            field: environment
          operator: equals
          value:
            literal: "prod"
    effect: block

  - id: prod_deploy_restricted
    scope:
      action: deploy_service
    when:
      all:
        - subject:
            domain: action
            field: environment
          operator: equals
          value:
            literal: "prod"

        - subject:
            domain: actor
            field: role
          operator: not_equals
          value:
            literal: "operator"
    effect: block

  - id: cluster_capacity_limit
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        subject:
          domain: snapshot
          field: cluster_capacity
    effect: block

  - id: freeze_production_deploys
    scope:
      action: deploy_service
    when:
      all:
        - subject:
            domain: snapshot
            field: production_freeze
          operator: equals
          value:
            literal: true
        - subject:
            domain: action
            field: environment
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
// 4. Context
// ------------------------------------------------------------
class RequestContext {
  role: string;
  agent_type: string;
  freeze: boolean;

  constructor(role: string, agent_type: string, freeze = false) {
    this.role = role;
    this.agent_type = agent_type;
    this.freeze = freeze;
  }
}

// ------------------------------------------------------------
// 5. Resolvers
// ------------------------------------------------------------
runtime.setActorResolver((ctx: RequestContext) => ({
  role: ctx.role,
  agent_type: ctx.agent_type
}));

runtime.setSnapshotResolver((ctx: RequestContext) => ({
  cluster_capacity: 10,
  production_freeze: ctx.freeze
}));

// ------------------------------------------------------------
// 6. Base functions
// ------------------------------------------------------------
function scale(service: string, replicas: number, environment: string) {
  console.log(`Scaling ${service}: ${replicas} replicas`);
}

function deploy(service: string, version: string, environment: string) {
  console.log(`Deploying ${service}:${version} to ${environment}`);
}

function deleteService(service: string, environment: string) {
  console.log(`Deleting service ${service}`);
}

// ------------------------------------------------------------
// 7. Protected operations
// ------------------------------------------------------------
const protectedScale = runtime.admit("scale_service", scale);
const protectedDeploy = runtime.admit("deploy_service", deploy);
const protectedDelete = runtime.admit("delete_service", deleteService);

// ------------------------------------------------------------
// 8. Contexts
// ------------------------------------------------------------
const aiAgent = new RequestContext("automation", "ai");
const operator = new RequestContext("operator", "human");
const freezeOperator = new RequestContext("operator", "human", true);

// ------------------------------------------------------------
// 9. Allowed operation
// ------------------------------------------------------------
await protectedScale.call(aiAgent, "search-api", 5, "staging");

// ------------------------------------------------------------
// 10. Blocked AI destructive action
// ------------------------------------------------------------
try {
  await protectedDelete.call(aiAgent, "search-api", "prod");
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("AI cannot delete production services");
  } else {
    throw e;
  }
}

// ------------------------------------------------------------
// 11. Blocked deployment
// ------------------------------------------------------------
try {
  await protectedDeploy.call(aiAgent, "search-api", "2.1", "prod");
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Only operators can deploy to production");
  } else {
    throw e;
  }
}

console.log("\nProduction freeze example");

// ------------------------------------------------------------
// 12. Freeze case
// ------------------------------------------------------------
try {
  await protectedDeploy.call(
    freezeOperator,
    "search-api",
    "2.5",
    "prod"
  );
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Deployment blocked due to production freeze");
  } else {
    throw e;
  }
}

// ------------------------------------------------------------
// 13. Explain calls (FIXED)
// ------------------------------------------------------------
console.log("\nExplain call for scale service");

runtime.explainCall(scale, {
  args: ["search-api", 20, "staging"],
  actionName: "scale_service",
  ctx: operator
});

console.log("\nExplain call for delete service");

runtime.explainCall(deleteService, {
  args: ["lookup-customer", "prod"],
  actionName: "delete_service",
  ctx: aiAgent
});