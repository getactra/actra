import { Policy } from "./policy"
import { getEngine, ensureEngineReady } from "./engine"
import { loadFile, loadPolicyDirectory } from "./loader"
import { ActraError } from "common/dist"

export class Actra {

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

      throw new ActraError(`Actra compilation failed: ${String(err)}`)
    }
  }

  static async fromFiles(
    schemaPath: string,
    policyPath: string,
    governancePath?: string
  ): Promise<Policy> {

    const schema = await loadFile(schemaPath)
    const policy = await loadFile(policyPath)

    const governance = governancePath
      ? await loadFile(governancePath)
      : undefined

    return this.fromStrings(schema, policy, governance)
  }

  static async fromDirectory(
    directory: string
  ): Promise<Policy> {

    const files = await loadPolicyDirectory(directory)

    return this.fromStrings(
      files.schema,
      files.policy,
      files.governance
    )
  }

  static async compilerVersion(): Promise<string> {
    await ensureEngineReady()
    return getEngine().compilerVersion()
  }
}