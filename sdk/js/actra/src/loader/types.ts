export interface ActraWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;

  actra_create: (schema: bigint, policy: bigint, gov: bigint) => bigint;
  actra_evaluate: (instanceId: number, input: bigint) => bigint;
  actra_policy_hash: (instanceId: number) => bigint;
  actra_compiler_version: () => bigint;
  actra_free: (instanceId: number) => void;

  actra_write_buffer: (len: number) => number;
  actra_buffer_from_js: (ptr: number, len: number) => bigint;
  actra_buffer_free: (ptr: number) => void;
}

export interface ActraWasmModule {
  exports: ActraWasmExports;
  memory: WebAssembly.Memory;
}

export type WasmInput =
  | URL
  | string
  | Response
  | Promise<Response>
  | ArrayBuffer
  | WebAssembly.Module;