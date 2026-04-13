# Actra Claude Skill

Generate **Actra policies, schema, and governance rules** using natural language.

This Claude Skill helps you go from **idea to enforceable policy YAML** in seconds.

---

## What this skill does

The Actra Claude Skill can:

* Generate **policy YAML** from plain English
* Create **schema definitions** for actions, actor and snapshot
* Suggest **safe policy patterns**
* Generate **governance policies**
* Explain **why a rule blocks an action**
* Create **test scenarios**

---

## Why this matters

Actra enforces decisions at runtime.

This skill helps you **write those decisions faster and correctly**.

> Actra enforces policies. Claude helps you create them.

---

## Getting Started

### 1. Download the skill

Download the `actra.skill` file:

```
https://raw.githubusercontent.com/getactra/actra/main/claude/actra-policy-generator.skill
```

---

### 2. Add to Claude

1. Open Claude
2. Go to **Customize**
3. Go to **Skills**
4. Select **+** > **+ Create skill** > **Upload a skill** Upload the downloaded `actra.skill` file
5. Activate the skill

---

### 3. Start prompting

You can now describe policies in natural language.

---

## Example Prompts

### Basic Policy

```
Generate a policy to block refunds above 5000
```

---

### Role-based Control

```
Allow refunds above 5000 only for admin users
```

---

### Governance Policy

```
Create a governance rule that ensures all delete actions require approval
```

---

### Agent Safety

```
Block AI agents from calling tools that modify infrastructure
```

---

### Explain Policy

```
Explain why this policy blocks a refund of 8000
```

---

## Example Output

```yaml
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
        literal: 5000
    effect: block
```

---

## How to use with Actra

1. Generate policy using Claude Skill
2. Copy the YAML
3. Load into Actra runtime

Example:

```python
policy = Actra.from_strings(schema, policy_yaml)
```

Actra will now enforce the generated policy **before execution**.

---

## Best Practices

* Start simple, then refine policies
* Use governance rules for safety-critical systems
* Always test policies with real scenarios
* Keep policies external to application logic

---

## Contributing

Want to improve the skill?

* Add better prompt templates
* Improve policy generation patterns
* Contribute real-world examples

---

## Related

* Main Repo: https://github.com/getactra/actra
* Docs: https://docs.actra.dev

---

## License

Apache 2.0
