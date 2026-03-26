import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
// ------------------------------------------------------------
const schemaYaml = `
version: 1

actions:

  disable_monitoring:
    fields:
      service: string

  delete_database:
    fields:
      database: string
      environment: string

  restart_service:
    fields:
      service: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    monitoring_disabled: boolean
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: block_ai_db_delete
    scope:
      action: delete_database
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

  - id: delete_requires_approval_when_monitoring_disabled
    scope:
      action: delete_database
    when:
      subject:
        domain: snapshot
        field: monitoring_disabled
      operator: equals
      value:
        literal: true
    effect: require_approval
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
  monitoring_disabled: boolean;

  constructor(role: string, agent_type: string, monitoring_disabled = false) {
    this.role = role;
    this.agent_type = agent_type;
    this.monitoring_disabled = monitoring_disabled;
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
  monitoring_disabled: ctx.monitoring_disabled
}));

// ------------------------------------------------------------
// 6. Base functions
// ------------------------------------------------------------
function disableMonitoring(service: string) {
  console.log(`Monitoring disabled for ${service}`);
}

function deleteDatabase(database: string, environment: string) {
  console.log(`Database ${database} deleted`);
}

function restartService(service: string) {
  console.log(`Restarting service ${service}`);
}

// ------------------------------------------------------------
// 7. Protected operations
// ------------------------------------------------------------
// IMPORTANT: no actionName provided → function name used
const protectedDisableMonitoring = runtime.admit(
  "disable_monitoring",
  disableMonitoring
);

const protectedDeleteDatabase = runtime.admit(
  "delete_database",
  deleteDatabase
);

const protectedRestartService = runtime.admit(
  "restart_service",
  restartService
);

// ------------------------------------------------------------
// 8. Contexts
// ------------------------------------------------------------
const aiAgent = new RequestContext("automation", "ai", true);
const operator = new RequestContext("operator", "human", true);

// ------------------------------------------------------------
// 9. Safe operation
// ------------------------------------------------------------
await protectedRestartService.call(aiAgent, "search-api");

// ------------------------------------------------------------
// 10. Risky multi-step operation
// ------------------------------------------------------------
try {
  await protectedDeleteDatabase.call(
    aiAgent,
    "customer-db",
    "staging"
  );
} catch (e: any) {
  if (e instanceof ActraPolicyError) {
    if (e.decision?.effect === "require_approval") {
      console.log(
        "Database deletion requires approval because monitoring is disabled"
      );
    } else {
      throw e;
    }
  }
}

// ------------------------------------------------------------
// 11. Debug policy decision (FIXED)
// ------------------------------------------------------------
console.log("\nExplain decision");

runtime.explainCall(deleteDatabase, {
  args: ["customer-db", "staging"],
  actionName: "delete_database",
  ctx: operator
});