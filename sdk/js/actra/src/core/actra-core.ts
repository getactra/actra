import { Policy } from "../common/policy"
import { getEngine, ensureEngineReady } from "../common/engine"
import { ActraError } from "../common/errors"

export class ActraCore {

  static async fromStrings(
    schemaYaml: string,
    policyYaml: string,
    governanceYaml?: string
  ): Promise<Policy> {

    if (!schemaYaml?.trim()) {
      throw new ActraError("Schema cannot be empty")
    }

    if (!policyYaml?.trim()) {
      throw new ActraError("Policy cannot be empty")
    }

    try {
      await ensureEngineReady()

      const engine = getEngine()

      const compiled = engine.compile(
        schemaYaml,
        policyYaml,
        governanceYaml
      )

      return new Policy(compiled)

    } catch (err) {
      if (err instanceof ActraError) {
        throw new ActraError(
          `Actra compilation failed: ${err.message}`
        )
      }

      throw new ActraError(
        `Actra compilation failed: ${String(err)}`
      )
    }
  }

  static async compilerVersion(): Promise<string> {
    await ensureEngineReady()
    return getEngine().compilerVersion()
  }
}