use std::collections::HashMap;

use actra::ast::PolicyAst;
use actra::compiler::compile_policy;
use actra::engine::{evaluate, EvaluationInput};
use actra::ir::{Effect, ScalarValue};
use actra::schema::{SchemaAst, Schema};

#[test]
fn block_when_fraud_flag_true() {
    // --- Schema YAML ---
    let schema_yaml = r#"
version: 1
actions:
  refund:
    fields:
      type: string
      amount: number
actor:
  fields:
    id: string
snapshot:
  fields:
    fraud_flag: boolean
"#;

    // --- Policy YAML ---
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

    // --- Parse Schema ---
    let schema_ast: SchemaAst = serde_yaml::from_str(schema_yaml).unwrap();
    let schema = Schema::from_ast(schema_ast);

    // --- Parse Policy ---
    let policy_ast: PolicyAst = serde_yaml::from_str(policy_yaml).unwrap();

    // --- Compile Policy ---
    let compiled_policy = compile_policy(&schema, policy_ast).unwrap();

    // --- Build Evaluation Input ---
    let input = EvaluationInput {
        action: HashMap::new(),
        actor: HashMap::new(),
        snapshot: {
            let mut map = HashMap::new();
            map.insert("fraud_flag".into(), ScalarValue::Boolean(true));
            map
        },
    };

    // --- Evaluate ---
    let result = evaluate(&compiled_policy, &input);

    // --- Assertions ---
    assert_eq!(result.effect, Effect::Block);
    assert_eq!(result.matched_rule, Some("block_if_fraud".to_string()));
}