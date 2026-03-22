import { describe, it, expect } from "vitest";
import { Actra, ActraRuntime } from "../src";

describe("Actra E2E", () => {
  const schema_yaml = `
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

  it("should allow action and execute function", async () => {
    const policy_yaml = `
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

    const policy = await Actra.fromStrings(schema_yaml, policy_yaml);
    console.log("############## Policy Hash ###############")
    console.log(policy.policyHash());

    const runtime = new ActraRuntime(policy);

    runtime.setActorResolver(() => ({ role: "agent" }));

    let executed = false;

    function refund(amount: number) {
      executed = true;
      console.log("Executed function refund: ", amount);
      return amount;
    }

    const secured = runtime.admit(
      "refund",
      refund,
      (args) => ({ amount: args[0] })
    );

    const result = await secured(100);

    expect(executed).toBe(true);
    expect(result).toBe(100);
  });

 it("should block action", async () => {
    const policy_yaml = `
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

    const policy = await Actra.fromStrings(schema_yaml, policy_yaml);
    const runtime = new ActraRuntime(policy);

    let executed = false;

    function refund(amount: number) {
      executed = true;
      console.log("Executed function refund: ", amount);
      return amount;
    }

    const secured = runtime.admit(
      "refund",
      refund,
      (args) => ({ amount: args[0] })
    );

    await expect(secured(5000)).rejects.toThrow("Action blocked");
  });
});