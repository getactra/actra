use actra::schema::{SchemaAst, Schema};


#[test]
fn parse_schema() {
    let yaml = r#"
version: 1

actions:
  refund:
    fields:
      amount: number
      currency: string

actor:
  fields:
    id: string
    role: string

snapshot:
  fields:
    fraud_flag: boolean
"#;

    let ast: SchemaAst = serde_yaml::from_str(yaml).unwrap();
    let schema = Schema::from_ast(ast);

    assert!(schema.actions.contains_key("refund"));
    assert!(schema.actor_fields.contains_key("id"));
}