import { ActraError } from "../common/errors";

export function getInstance(
  result: WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource
): WebAssembly.Instance {
  if (result instanceof WebAssembly.Instance) {
    return result;
  }

  const instance =
    (result as WebAssembly.WebAssemblyInstantiatedSource).instance;

  if (!instance) {
    throw new ActraError("Invalid WebAssembly instantiation result");
  }

  return instance;
}

export async function instantiate(
  bytes: BufferSource,
  imports: WebAssembly.Imports
): Promise<WebAssembly.Instance> {
  const result = await WebAssembly.instantiate(bytes, imports);
  return getInstance(result);
}