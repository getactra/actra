# ⚡ Actra

> **Control what runs — before it runs**

Actra is an **in-process policy engine** for modern applications, APIs, and AI agents.

Evaluate decisions **inside your application** — with zero latency, no infrastructure, and fully deterministic behavior.

---

## 🚀 Why Actra?

Modern systems don’t just respond — they act.

* APIs execute operations
* Workflows automate decisions
* AI agents take real-world actions

Policy can no longer sit behind infrastructure.

**It must run where execution happens.**

---

## ⚡ Key Capabilities

* ⚡ **Zero infrastructure**
  No sidecars. No services. Runs directly in your app.

* 🌍 **Runs everywhere**
  Node.js, Bun, Deno, browser, edge, WASM

* 🤖 **Built for agents**
  Control tools, APIs, and workflows in real time

* 🧠 **Deterministic by design**
  Same input → same decision, every time

* 🛡 **Policy governance**
  Control what policies are allowed to define, enforce, and evaluate

---

## 🧩 How It Works

Traditional systems:

```
App → Network → Policy Service → Decision
```

Actra:

```
App → Actra → Decision ⚡
```

No network. No latency. No external dependency.

---

## 📦 Installation

```bash
npm install @getactra/actra
```

---

## ⚡ Quick Example

### 1. Define Schema

```ts
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
```

---

### 2. Define Policy

```ts
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
```

---

### 3. Compile Policy

```ts
import { Actra } from "@getactra/actra";

const policy = await Actra.fromStrings(schemaYaml, policyYaml);
```

---

### 4. Create Runtime

```ts
import { ActraRuntime } from "@getactra/actra";

const runtime = new ActraRuntime(policy);
```

---

### 5. Register Context

```ts
runtime.setActorResolver(() => ({ role: "support" }));
runtime.setSnapshotResolver(() => ({ fraud_flag: false }));
```

---

### 6. Protect a Function

```ts
function refund(amount: number) {
  console.log("Refund executed:", amount);
  return amount;
}

const protectedRefund = runtime.admit("refund", refund);
```

---

### 7. Execute

```ts
import { ActraPolicyError } from "@getactra/actra";

await protectedRefund(200); // ✅ allowed

try {
  await protectedRefund(1500); // ❌ blocked
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Blocked by policy:", e.matchedRule);
  }
}
```

---

## 🤖 Built for Agent Systems

Actra enables **real-time control over actions**:

* Tool execution
* API calls
* Workflow steps
* External integrations

Define what is allowed — **before execution happens**

---

## 🛡 Policy Governance

Actra doesn’t just enforce policies — it governs them.

Define boundaries on:

* What policies can evaluate
* Which fields and domains they can access
* What kinds of rules can be expressed
* How decisions are enforced

This prevents:

* Unsafe or overly permissive policies
* Policy drift across teams
* Uncontrolled behavior in agent systems

Governance ensures policies remain **safe, predictable, and within defined limits**.

---

## 🧠 Philosophy

> Policy should not live in infrastructure.
> It should execute where decisions are made.

---

## ⚙️ Core Concepts

### Schema

Defines the structure of:

* Actions
* Actor
* Snapshot

---

### Policy

Declarative rules:

* `scope` → where rule applies
* `when` → condition
* `effect` → allow / block

---

### Runtime

Executes decisions **in-process** and enforces policies on functions.

---

### admit()

Wraps a function with policy enforcement:

```ts
const protectedFn = runtime.admit("action_name", fn);
```

---

## 🏗 Advanced Usage

### Field Mapping (recommended)

```ts
runtime.admit("refund", refund, {
  fields: ["amount"]
});
```

---

### Custom Builder

```ts
runtime.admit("refund", refund, {
  builder: (type, kwargs, ctx) => ({
    amount: kwargs.amount
  })
});
```

---

### Object-style Input

```ts
function refund(input: { amount: number }) {}

const protectedRefund = runtime.admit("refund", refund);

await protectedRefund({ amount: 200 });
```

---

## 🌍 Environment Support

| Runtime                   | Supported |
| ------------------------- | --------- |
| Node.js                   | ✅         |
| Browser                   | ✅         |
| Edge (Cloudflare, Vercel) | ✅         |
| Bun / Deno                | ✅         |
| WASM                      | ✅         |

---

## ⚡ Use Cases

* 🤖 AI agent guardrails
* 🔐 Authorization (RBAC / ABAC)
* ⚡ Edge decisioning
* 🔄 Workflow control
* 🧩 Business rules engine

---

## ⚖️ Why Not Traditional Policy Engines?

| Capability     | Actra      | Traditional      |
| -------------- | ---------- | ---------------- |
| Execution      | In-process | External service |
| Latency        | Zero       | Network-bound    |
| Infra required | None       | Yes              |
| Edge / browser | Native     | Limited          |
| Agent control  | Native     | Not supported    |

---

## 📚 API

### Compile policy

```ts
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
```

---

### Create runtime

```ts
const runtime = new ActraRuntime(policy);
```

---

### Register resolvers

```ts
runtime.setActorResolver(() => ({}));
runtime.setSnapshotResolver(() => ({}));
```

---

### Protect function

```ts
runtime.admit("action_name", fn);
```

---

## 🛣 Roadmap

* Policy debugging tools
* Visual policy builder
* CLI
* Observability hooks
* Policy marketplace

---

## 🤝 Contributing

PRs, feedback, and ideas are welcome.

---

## 📄 License

APACHE-2.0

---

## 💡 Final Thought

Actra is not just another policy engine.

It’s a shift from:

**infrastructure policy → execution control**

---

⭐ If this resonates, give the repo a star.
