import { ActraError } from "../common/errors"
import fs from "fs/promises"
import path from "path"

async function readRequiredFile(filePath: string, label: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf8")

    if (!content.trim()) {
      throw new ActraError(`Actra ${label} is empty: ${filePath}`)
    }

    return content
  } catch (err: any) {
    throw new ActraError(
      `Actra failed to load ${label} (${filePath}): ${err?.message || err}`
    )
  }
}

async function readOptionalFile(filePath: string): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath, "utf8")
    return content.trim() ? content : undefined
  } catch {
    return undefined
  }
}

export async function loadFile(filePath: string): Promise<string> {
  return readRequiredFile(filePath, "file")
}

export async function loadPolicyDirectory(
  dir: string
): Promise<{
  schema: string
  policy: string
  governance?: string
}> {

  const base = path.resolve(dir)

  const schemaPath = path.join(base, "schema.yaml")
  const policyPath = path.join(base, "policy.yaml")
  const governancePath = path.join(base, "governance.yaml")

  const schema = await readRequiredFile(schemaPath, "schema.yaml")
  const policy = await readRequiredFile(policyPath, "policy.yaml")
  const governance = await readOptionalFile(governancePath)

  return {
    schema,
    policy,
    governance
  }
}