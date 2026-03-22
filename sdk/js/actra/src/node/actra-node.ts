import { ActraCore } from "../core/actra-core"
import { loadFile, loadPolicyDirectory } from "./file-loader"
import { ActraError } from "../common/errors"
import { Policy } from "../common/policy"

export class ActraNode extends ActraCore {

  static async fromFiles(
    schemaPath: string,
    policyPath: string,
    governancePath?: string
  ): Promise<Policy> {
    try {
      const schema = await loadFile(schemaPath)
      const policy = await loadFile(policyPath)

      const governance = governancePath
        ? await loadFile(governancePath)
        : undefined

      return this.fromStrings(schema, policy, governance)
    } catch (err: any) {
      throw new ActraError(
        `Actra failed to load policy from files: ${err?.message || err}`,
      )
    }
  }

  static async fromDirectory(
    directory: string
  ): Promise<Policy> {
    try {
      const files = await loadPolicyDirectory(directory)

      return this.fromStrings(
        files.schema,
        files.policy,
        files.governance
      )

    } catch (err: any) {
      throw new ActraError(
        `Actra failed to load policy directory: ${err?.message || err}`,
      )
    }
  }
}