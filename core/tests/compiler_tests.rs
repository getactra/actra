use actiongate_core::ast::PolicyAst;
use actiongate_core::compiler::compile_policy;
use actiongate_core::schema::{SchemaAst, Schema};

#[test]
fn compile_simple_policy() {
    let schema_yaml = r#"
version: 1
actions:
  refund:
    fields:
      amount: number
actor:
  fields:
    id: string
snapshot:
  fields:
    fraud_flag: boolean
"#;

    let policy_yaml = r#"
version: 1
rules:
  - id: block_if_fraud
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

    let schema_ast: SchemaAst = serde_yaml::from_str(schema_yaml).unwrap();
    let schema = Schema::from_ast(schema_ast);

    let policy_ast: PolicyAst = serde_yaml::from_str(policy_yaml).unwrap();

    let compiled = compile_policy(&schema, policy_ast);

    assert!(compiled.is_ok());
}


#[test]
fn fail_on_type_mismatch() {
    let schema_yaml = r#"
version: 1
actions: {}
actor:
  fields: {}
snapshot:
  fields:
    fraud_flag: boolean
"#;

    let policy_yaml = r#"
version: 1
rules:
  - id: invalid_rule
    scope:
      global: true
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: greater_than
      value:
        literal: 10
    effect: block
"#;

    let schema_ast: SchemaAst = serde_yaml::from_str(schema_yaml).unwrap();
    let schema = Schema::from_ast(schema_ast);
    let policy_ast: PolicyAst = serde_yaml::from_str(policy_yaml).unwrap();

    let result = compile_policy(&schema, policy_ast);

    assert!(result.is_err());
}