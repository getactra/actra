export function getInstance(
  result: WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource
): WebAssembly.Instance {
  return result instanceof WebAssembly.Instance
    ? result
    : result.instance;
}

export async function instantiate(
  bytes: BufferSource,
  imports: WebAssembly.Imports
): Promise<WebAssembly.Instance> {
  const result = await WebAssembly.instantiate(bytes, imports);
  return getInstance(result);
}