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
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: large_scale_requires_approval
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        literal: 15
    effect: require_approval

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

  constructor(role: string, agent_type: string) {
    this.role = role;
    this.agent_type = agent_type;
  }
}

// ------------------------------------------------------------
// 5. Resolvers
// ------------------------------------------------------------
runtime.setActorResolver((ctx: RequestContext) => ({
  role: ctx.role,
  agent_type: ctx.agent_type
}));

runtime.setSnapshotResolver(() => ({
  cluster_capacity: 20
}));

// ------------------------------------------------------------
// 6. Base functions
// ------------------------------------------------------------
function scale(service: string, replicas: number, environment: string) {
  console.log(`Scaling ${service} to ${replicas} replicas`);
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

// ------------------------------------------------------------
// 9. Allowed operation
// ------------------------------------------------------------
await protectedScale.call(aiAgent, "search-api", 5, "staging");

// ------------------------------------------------------------
// 10. Requires approval (IMPORTANT CASE)
// ------------------------------------------------------------
try {
  await protectedScale.call(aiAgent, "search-api", 20, "staging");
} catch (e: any) {
  if (e instanceof ActraPolicyError) {
    if (e.decision?.effect === "require_approval") {
      console.log("Scaling requires human approval");
    } else {
      throw e;
    }
  }
}

// ------------------------------------------------------------
// 11. Blocked destructive action
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
// 12. Debug decision (FIXED)
// ------------------------------------------------------------
console.log("\nExplain decision for scaling");

runtime.explainCall(scale, {
  args: ["search-api", 20, "staging"],
  actionName: "scale_service",
  ctx: operator
});