//actra.ts
import { Policy } from "./policy"
import { getEngine, ensureEngineReady } from "./engine"
import { loadFile, loadPolicyDirectory } from "./loader"

/*
 Actra compiler facade.

 Responsible for compiling policies and returning Policy instances.
 The underlying engine implementation is registered by the platform
 adapter (server/browser).
*/
export class Actra {

    private static get engine() {
        return getEngine()
    }

    /** 
    Compile policy from YAML strings
    */
    static async fromStrings(
        schemaYaml: string,
        policyYaml: string,
        governanceYaml?: string
    ): Promise<Policy> {
        try {
            await ensureEngineReady()

            const compiled = this.engine.compile(
                schemaYaml,
                policyYaml,
                governanceYaml
            )

            return new Policy(compiled)

        } catch (err) {
            throw new Error(`Actra compilation failed: ${err}`)
        }
    }

    /*
    Compile policy from YAML files
    */
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

    /*
    Compile policy from directory
    */
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

    /* 
    Return Actra compiler version
    */
    static async compilerVersion(): Promise<string> {
        return this.engine.compilerVersion()

    }
}
