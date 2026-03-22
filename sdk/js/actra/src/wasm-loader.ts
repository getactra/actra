import { ActraError } from "@actra/common";

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

type WasmInput = URL | string;

export async function loadActraWasm(
  input: WasmInput
): Promise<ActraWasmModule> {

  let instance: WebAssembly.Instance;

  const imports: WebAssembly.Imports = {
    env: {
      abort: () => {
        throw new ActraError("Actra runtime engine import aborted");
      }
    }
  };

  async function instantiate(bytes: BufferSource) {
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    return instance;
  }

  const isNode =
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    !!process.versions.node;

  const isDeno =
    typeof Deno !== "undefined" &&
    typeof Deno.readFile === "function";

  try {
    if (!isNode && !isDeno) {
      const res = await fetch(input);

      if (!res.ok) {
        throw new ActraError(`Failed to fetch Actra runtime engine: ${res.status}`);
      }

      if (WebAssembly.instantiateStreaming) {
        try {
          const { instance: inst } =
            await WebAssembly.instantiateStreaming(res, imports);
          instance = inst;
        } catch {
          const bytes = await res.arrayBuffer();
          instance = await instantiate(bytes);
        }
      } else {
        const bytes = await res.arrayBuffer();
        instance = await instantiate(bytes);
      }
    }

    else if (isDeno) {
      let bytes: BufferSource;

      if (input instanceof URL && input.protocol === "file:") {
        bytes = await Deno.readFile(input);
      } else {
        const res = await fetch(input);
        if (!res.ok) throw new ActraError(`Failed to fetch Actra runtime engine: ${res.status}`);
        bytes = await res.arrayBuffer();
      }

      instance = await instantiate(bytes);
    }

    else {
      let bytes: BufferSource;

      if (input instanceof URL && input.protocol === "file:") {
        const fs = await import(/* webpackIgnore: true */ "fs/promises");
        bytes = await fs.readFile(input);
      } 
      else if (typeof input === "string" && !input.startsWith("http")) {
        const fs = await import(/* webpackIgnore: true */ "fs/promises");
        bytes = await fs.readFile(input);
      }
      else {
        const res = await fetch(input);
        if (!res.ok) throw new ActraError(`Failed to fetch Actra runtime engine: ${res.status}`);
        bytes = await res.arrayBuffer();
      }

      instance = await instantiate(bytes);
    }

  } catch (err: any) {
    if (err instanceof Error) {
      throw new ActraError(`Actra runtime engine load failed: ${err.message}`, { cause: err });
    }
    throw new ActraError(`Actra runtime engine load failed: ${String(err)}`);
  }

  const exports = instance.exports as unknown as ActraWasmExports;
  const memory = exports.memory;

  if (!memory) {
    throw new ActraError("Actra runtime engine memory export not found");
  }

  const required = [
    "actra_create",
    "actra_evaluate",
    "actra_buffer_from_js",
    "actra_buffer_free"
  ];

  for (const fn of required) {
    if (typeof (exports as any)[fn] !== "function") {
      throw new ActraError(`Missing Actra runtime engine export: ${fn}`);
    }
  }

  return { exports, memory };
}