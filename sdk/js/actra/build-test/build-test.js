import { Actra, ActraRuntime } from "../dist/index.js"

async function run() {

  const schema = `
version: 1
actions:
  refund:
    fields:
      amount: number
actor:
  fields: {}
snapshot:
  fields: {}
`

  const policy = `
version: 1
rules:
  - id: block_large_refund
    scope:
      action: "refund"
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
`

  const actra = await Actra.fromStrings(schema, policy)

  const runtime = new ActraRuntime(actra)

  const secured = runtime.admit(
    "refund",
    (amount) => {
      console.log("Executed:", amount)
      return amount
    },
    (args) => ({ amount: args[0] })
  )

  try {
    await secured(10000)
  } catch (err) {
    console.log("Blocked as expected:", err.message)
  }
}

run()