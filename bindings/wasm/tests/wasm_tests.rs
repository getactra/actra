use actra_wasm::*;

fn read_buffer(buf: WasmBuffer) -> String {
    unsafe {
        let slice = std::slice::from_raw_parts(buf.ptr, buf.len);
        let s = std::str::from_utf8(slice).unwrap().to_string();

        actra_string_free(buf.ptr, buf.len);

        s
    }
}

/// Test1

#[test]
fn test_compiler_version() {
    let buf = actra_compiler_version();
    let out = read_buffer(buf);

    let parsed: serde_json::Value = serde_json::from_str(&out).unwrap();
    println!("{}", serde_json::to_string_pretty(&parsed).unwrap());

    assert!(out.contains("ok"));
}


//// Test 2

#[test]
fn test_create_instance() {
    let schema = r#"
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

    let policy = r#"
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
"#;

    let buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let out = read_buffer(buf);

    // Parse JSON response
    let parsed: serde_json::Value = serde_json::from_str(&out).unwrap();

    assert_eq!(parsed["ok"], "true");

    // Ensure instance id is returned
    let instance_id = parsed["data"].as_str().unwrap();

    println!("{}",&instance_id);

    let hash_buf = actra_policy_hash(instance_id    
        .parse::<i32>()
        .unwrap());

    let hash_out = read_buffer(hash_buf);

    println!("{}", hash_out);

    assert!(!instance_id.is_empty());
}


/// Test 3

#[test]
fn test_evaluate_allow() {
    let schema = r#"
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

    let policy = r#"
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
"#;

    // Step 1: Create instance
    let create_buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let create_out = read_buffer(create_buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&create_out).unwrap();

    assert_eq!(
        parsed["ok"],
        "true",
        "Create failed: {}",
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    let instance_id = parsed["data"]
        .as_str()
        .unwrap()
        .parse::<i32>()
        .unwrap();

    // Step 2: Prepare input
    let input = r#"
{
    "action": {"type": "refund", "amount": 500},
    "actor": {"role": "support"},
    "snapshot": {}
}
"#;

    // Step 3: Evaluate
    let eval_buf = actra_evaluate(
        instance_id,
        input.as_ptr(),
        input.len(),
    );

    let eval_out = read_buffer(eval_buf);

    let eval_parsed: serde_json::Value =
        serde_json::from_str(&eval_out).unwrap();

    println!("{}", serde_json::to_string_pretty(&eval_parsed).unwrap());


    // Step 4: Assertions
    assert_eq!(eval_parsed["ok"], "true");

    let data = &eval_parsed["data"];

    assert_eq!(data["effect"], "allow");
    assert_eq!(data["matched_rule"], "");
}

/// Test 3

#[test]
fn test_evaluate_block() {
    let schema = r#"
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

    let policy = r#"
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
"#;

    let create_buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let create_out = read_buffer(create_buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&create_out).unwrap();

    assert_eq!(
        parsed["ok"],
        "true",
        "Create failed: {}",
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    let instance_id = parsed["data"]
        .as_str()
        .unwrap()
        .parse::<i32>()
        .unwrap();

    let input = r#"{    
        "action": {"type": "refund", "amount": 1500},
        "actor": {"role": "support"},
        "snapshot": {"fraud_flag": false}
    }"#;

    let eval_buf = actra_evaluate(
        instance_id,
        input.as_ptr(),
        input.len(),
    );

    let eval_out = read_buffer(eval_buf);

    let eval_parsed: serde_json::Value =
        serde_json::from_str(&eval_out).unwrap();

    println!("{}", serde_json::to_string_pretty(&eval_parsed).unwrap());

    assert_eq!(eval_parsed["data"]["effect"], "block");
}

#[test]
fn test_invalid_instance() {
    let input = r#"{"action":{},"actor":{},"snapshot":{}}"#;

    let buf = actra_evaluate(
        9999, // invalid instance
        input.as_ptr(),
        input.len(),
    );

    let out = read_buffer(buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&out).unwrap();

    assert_eq!(parsed["ok"], "false");
    assert!(parsed["error"].as_str().unwrap().contains("invalid"));
}


#[test]
fn test_invalid_json_input() {
    let schema = r#"
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

    let policy = r#"
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
"#;

    let create_buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let create_out = read_buffer(create_buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&create_out).unwrap();

    assert_eq!(
        parsed["ok"],
        "true",
        "Create failed: {}",
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    let instance_id = parsed["data"]
        .as_str()
        .unwrap()
        .parse::<i32>()
        .unwrap();

    // Broken JSON
    let bad_input = r#"{ invalid json "#;

    let buf = actra_evaluate(
        instance_id,
        bad_input.as_ptr(),
        bad_input.len(),
    );

    let out = read_buffer(buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&out).unwrap();

    assert_eq!(parsed["ok"], "false");

    let err = parsed["error"].as_str().unwrap_or("");

    println!("Error response:\n{}", 
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    assert!(!err.is_empty());
}


#[test]
fn test_empty_schema() {
    let schema = ""; // invalid
    let policy = r#" 
rules:
  - id: allow_all
    when: true
    effect: allow
"#;

    let buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let out = read_buffer(buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&out).unwrap();

    assert_eq!(parsed["ok"], "false");
    assert!(parsed["error"].as_str().unwrap().contains("Schema"));
}



#[test]
fn test_use_after_free() {
    let schema = r#"
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

    let policy = r#"
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
"#;

    let create_buf = actra_create(
        schema.as_ptr(),
        schema.len(),
        policy.as_ptr(),
        policy.len(),
        std::ptr::null(),
        0,
    );

    let create_out = read_buffer(create_buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&create_out).unwrap();

    assert_eq!(
        parsed["ok"],
        "true",
        "Create failed: {}",
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    let instance_id = parsed["data"]
        .as_str()
        .unwrap()
        .parse::<i32>()
        .unwrap();

    //Free instance
    actra_free(instance_id);

    let input = r#"{"action":{},"actor":{},"snapshot":{}}"#;

    let buf = actra_evaluate(
        instance_id,
        input.as_ptr(),
        input.len(),
    );

    let out = read_buffer(buf);

    let parsed: serde_json::Value =
        serde_json::from_str(&out).unwrap();

    assert_eq!(parsed["ok"], "false");

    let err = parsed["error"].as_str().unwrap_or("");

    println!("Use-after-free response:\n{}", 
        serde_json::to_string_pretty(&parsed).unwrap()
    );

    assert!(err.contains("invalid"));
}