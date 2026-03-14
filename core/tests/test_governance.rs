use actra::ast::PolicyAst;
use actra::compiler::{compile_with_governance};
use actra::errors::CompileError;
use actra::governance::GovernanceAst;
use actra::schema::{Schema, SchemaAst};

#[test]
fn governance_forbids_global_block() {
    // ---------------------------
    // Minimal Schema YAML
    // ---------------------------
    let schema_yaml = r#"
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
"#;

    let schema_ast: SchemaAst = serde_yaml::from_str(schema_yaml).unwrap();
    let schema = Schema::from_ast(schema_ast);

    // ---------------------------
    // Policy WITH global block
    // ---------------------------
    let policy_yaml = r#"
version: 1

rules:
  - id: block_all
    scope:
      global: true
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block
"#;

    let policy: PolicyAst = serde_yaml::from_str(policy_yaml).unwrap();

    // ---------------------------
    // Governance forbidding global block
    // ---------------------------
    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: no_global_block
      select:
        where:
          scope:
            global: true
          effect: block
      must:
        forbid: true
      error: "Global block rules are not allowed"
"#;

    let governance: GovernanceAst = serde_yaml::from_str(governance_yaml).unwrap();

    // ---------------------------
    // Compile WITH governance
    // ---------------------------
    let result = compile_with_governance(&schema, policy, &governance);

    // ---------------------------
    // Expect governance failure
    // ---------------------------
    match result {
        Err(CompileError::Governance(violations)) => {
            assert_eq!(violations.len(), 1);
            assert_eq!(violations[0].rule_id, "no_global_block");
        }
        _ => panic!("Expected governance failure"),
    }
}


//----------------------
//Test Governance Min count
//------------------------

#[test]
fn governance_requires_minimum_rule_count() {
    let schema_yaml = r#"
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
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy WITHOUT fraud rule
    let policy_yaml = r#"
version: 1

rules:
  - id: allow_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 10
    effect: allow
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: require_fraud_rule
      select:
        where:
          effect: block
      must:
        min_count: 1
      error: "At least one block rule required"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    match result {
        Err(actra::errors::CompileError::Governance(violations)) => {
            assert_eq!(violations.len(), 1);
            assert_eq!(violations[0].rule_id, "require_fraud_rule");
        }
        _ => panic!("Expected governance failure due to missing block rule"),
    }
}


#[test]
fn governance_fails_when_exceeding_max_count() {
    let schema_yaml = r#"
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
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy with TWO block rules
    let policy_yaml = r#"
version: 1

rules:
  - id: block_rule_1
    scope:
      action: refund
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block

  - id: block_rule_2
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
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: max_one_block_rule
      select:
        where:
          effect: block
      must:
        max_count: 1
      error: "Only one block rule allowed"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    match result {
        Err(actra::errors::CompileError::Governance(violations)) => {
            assert_eq!(violations.len(), 1);
            assert_eq!(violations[0].rule_id, "max_one_block_rule");
        }
        _ => panic!("Expected governance failure due to max_count violation"),
    }
}

#[test]
fn governance_applies_only_to_target_action() {
    let schema_yaml = r#"
version: 1

actions:
  refund:
    fields:
      amount: number
  chargeback:
    fields:
      amount: number

actor:
  fields:
    role: string

snapshot:
  fields:
    fraud_flag: boolean
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy only has chargeback rule
    let policy_yaml = r#"
version: 1

rules:
  - id: allow_chargeback
    scope:
      action: chargeback
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 10
    effect: allow
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: refund_must_have_block
      applies_to:
        actions:
          - refund
      select:
        where:
          effect: block
      must:
        min_count: 1
      error: "Refund must have a block rule"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    // Should pass because policy has no refund rules,
    // so governance rule is skipped.
    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    assert!(result.is_ok());
}


#[test]
fn governance_requires_rule_using_specific_field() {
    let schema_yaml = r#"
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
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy WITHOUT fraud_flag rule
    let policy_yaml = r#"
version: 1

rules:
  - id: allow_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 10
    effect: allow
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: require_fraud_rule
      select:
        where:
          when:
            subject:
              domain: snapshot
              field: fraud_flag
      must:
        min_count: 1
      error: "Fraud rule required"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    assert!(result.is_err());
}

#[test]
fn governance_fails_when_rule_uses_disallowed_field() {

    let schema_yaml = r#"
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
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy references action.amount
    let policy_yaml = r#"
version: 1

rules:
  - id: refund_rule
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 100
    effect: allow
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: restrict_fields
      select:
        where:
          effect: allow
      must:
        allowed_fields:
          - snapshot.fraud_flag
      error: "Only fraud_flag may be used"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    assert!(result.is_err());
}


#[test]
fn governance_passes_when_rule_uses_only_allowed_field() {

    let schema_yaml = r#"
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
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy references fraud_flag only
    let policy_yaml = r#"
version: 1

rules:
  - id: fraud_block
    scope:
      action: refund
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: restrict_fields
      select:
        where:
          effect: block
      must:
        allowed_fields:
          - snapshot.fraud_flag
      error: "Only fraud_flag allowed"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    assert!(result.is_ok());
}


#[test]
fn governance_skipped_when_target_action_not_present() {
    let schema_yaml = r#"
version: 1

actions:
  refund:
    fields:
      amount: number
  chargeback:
    fields:
      amount: number

actor:
  fields:
    role: string

snapshot:
  fields:
    fraud_flag: boolean
"#;

    let schema_ast: actra::schema::SchemaAst =
        serde_yaml::from_str(schema_yaml).unwrap();
    let schema = actra::schema::Schema::from_ast(schema_ast);

    // Policy only defines chargeback rule
    let policy_yaml = r#"
version: 1

rules:
  - id: allow_chargeback
    scope:
      action: chargeback
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 10
    effect: allow
"#;

    let policy: actra::ast::PolicyAst =
        serde_yaml::from_str(policy_yaml).unwrap();

    // Governance rule only applies to refund
    let governance_yaml = r#"
version: 1

governance:
  rules:
    - id: refund_must_have_block
      applies_to:
        actions:
          - refund
      select:
        where:
          effect: block
      must:
        min_count: 1
      error: "Refund policies must include a block rule"
"#;

    let governance: actra::governance::GovernanceAst =
        serde_yaml::from_str(governance_yaml).unwrap();

    // Governance rule should be skipped because
    // policy does not contain any refund rules
    let result =
        actra::compiler::compile_with_governance(&schema, policy, &governance);

    assert!(result.is_ok());
}