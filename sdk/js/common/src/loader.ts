import fs from "fs/promises"
import path from "path"

export async function loadFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8")
}

export async function loadPolicyDirectory(
  dir: string
): Promise<{
  schema: string
  policy: string
  governance?: string
}> {

  const base = path.resolve(dir)

  let schema: string
  let policy: string
  let governance: string | undefined

  try {
    schema = await loadFile(path.join(base, "schema.yaml"))
  } catch (err: any) {
    throw new Error(
      `Actra policy directory missing schema.yaml: ${err?.message || err}`
    )
  }

  try {
    policy = await loadFile(path.join(base, "policy.yaml"))
  } catch (err: any) {
    throw new Error(
      `Actra policy directory missing policy.yaml: ${err?.message || err}`
    )
  }

  try {
    governance = await loadFile(path.join(base, "governance.yaml"))
  } catch {
    governance = undefined
  }

  return {
    schema,
    policy,
    governance
  }
}
