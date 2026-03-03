use actiongate_core::ast::PolicyAst;

#[test]
fn parse_simple_policy() {
    let yaml = r#"
version: 1
rules:
  - id: test_rule
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

    let parsed: PolicyAst = serde_yaml::from_str(yaml).unwrap();

    assert_eq!(parsed.version, 1);
    assert_eq!(parsed.rules.len(), 1);
}

