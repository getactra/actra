# Actra

[![PyPI version](https://img.shields.io/pypi/v/actra.svg)](https://pypi.org/project/actra/)
[![PyPI downloads](https://img.shields.io/pypi/dm/actra)](https://pypi.org/project/actra/)

**Action Admission Control for Automated Systems**

Deterministic policy engine that decides whether automated actions are **allowed before they execute**.

Actra prevents unsafe operations in:

* AI agents
* APIs
* automation systems
* background workers
* workflows

Instead of embedding control logic in application code, Actra evaluates **external policies** before state-changing actions run.

---

![MCP Demo](docs/mcp-demo.gif)

Agent attempted to call an MCP tool.

Actra evaluated policy and **blocked the unsafe operation before execution**

---

## Why Actra?

Modern systems increasingly perform actions automatically:

* AI agents calling tools
* workflow automation
* API integrations
* background jobs

These systems can trigger **powerful state-changing operations**, such as:

* issuing refunds
* deleting resources
* sending payments
* modifying infrastructure

Today these controls often live inside application code:

```python
if amount > 1000:
    raise Exception("Refund too large")
```

This creates problems:

* rules duplicated across services
* difficult to audit behavior
* policy changes require redeploys
* automation becomes risky

Actra moves these decisions into **deterministic external policies evaluated before the action executes**.

---

## 20-Second Example

```python
@actra.admit()
def refund(amount):
    ...
```

The rule lives in policy:

```yaml
rules:
  - id: block_large_refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
```

```markdown
Result:

refund(200)   > allowed  
refund(1500)  > blocked by policy
```

Actra evaluates the policy **before the function executes** and blocks refunds greater than 1000.

---

## Installation

```bash
pip install actra
```

See the **examples/** directory for quick start examples.

---

## Architecture

Actra evaluates policies **before operations execute**.

```mermaid
flowchart LR

A[Application / Agent / API] --> B[Action Request]

B --> C[Actra Admission Control]

C --> D[Schema]
C --> E[Policies]
C --> F[Governance (optional)]
C --> G[Runtime Context]

G --> G1[Actor]
G --> G2[Action]
G --> G3[Snapshot]

C --> H{Decision}

H -->|Allow| I[Execute Operation]
H -->|Block| J[Operation Prevented]
```

---

## Example Use Cases

Actra can control many automated operations.

### AI Agents

* restrict tool execution
* prevent critical infrastructure changes
* enforce safety policies

### APIs

* block large refunds
* prevent destructive operations
* enforce safety checks

### Automation

* enforce workflow rules
* restrict financial operations
* require approval thresholds

### Infrastructure

* prevent destructive changes
* enforce safe deployment policies

---

## SDKs

Actra supports multiple runtimes.

| Runtime | Status       |
| ------- | ------------ |
| Python  | Available    |
| Node.js | WIP          |
| Rust    | Core runtime |
| WASM    | Planned      |
| Go      | Planned      |

---

## Actra vs OPA vs Cedar

| Feature           | Actra                            | OPA                            | Cedar                         |
| ----------------- | -------------------------------- | ------------------------------ | ----------------------------- |
| Primary purpose   | Admission control for operations | General policy engine          | Authorization policy language |
| Evaluation timing | **Before executing actions**     | Usually request-time decisions | Authorization decisions       |
| Integration model | Function / action enforcement    | API / sidecar / middleware     | Service authorization         |
| Policy style      | Structured YAML rules            | Rego language                  | Cedar language                |
| Determinism focus | Strong                           | Moderate                       | Strong                        |
| Target systems    | Agents, automation, APIs         | Infrastructure, Kubernetes     | Application authorization     |
| Typical use case  | Block unsafe operations          | Policy enforcement in infra    | Access control                |

### Positioning

Actra focuses on **controlling actions before they execute**, especially in automated or agent-driven systems.

OPA and Cedar focus primarily on **authorization decisions**, such as:

* “Can user X access resource Y?”

Actra focuses on **admission control for mutations**, such as:

* Should this refund execute?
* Should an agent run this tool?
* Should this workflow step proceed?

### Example Scenarios

| Scenario                                         | Best Tool |
| ------------------------------------------------ | --------- |
| Can a user access a document?                    | Cedar     |
| Can a service access an API?                     | OPA       |
| Should an automated system execute an operation? | Actra     |


---

## Documentation

Full documentation coming soon.

Refer to the **examples** folder for detailed usage examples.

Planned documentation sections:

* policy language
* MCP integration
* agent safety
* runtime architecture
* advanced policy patterns

---

## License

Apache 2.0
