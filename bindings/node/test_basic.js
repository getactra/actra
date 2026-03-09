const { Actra } = require('./index')

const schema = `
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
`

const policy = `
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
`

const actra = new Actra(schema, policy)

const result = actra.evaluate({
  action: { type: "delete" },
  actor: { role: "admin" },
  snapshot: {}
})

console.log(result)