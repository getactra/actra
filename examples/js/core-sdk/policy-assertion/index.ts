import { Actra } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Load policy from directory
// ------------------------------------------------------------
const policy = await Actra.fromDirectory("policy");

// ------------------------------------------------------------
// 2. Assert expected effect
// ------------------------------------------------------------
await policy.assertEffect(
  {
    action: { type: "refund", amount: 200 },
    actor: { role: "support" },
    snapshot: { fraud_flag: false }
  },
  "allow"
);

console.log("Policy test passed");