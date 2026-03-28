import { ActraError } from "../common/errors";
import { instantiate, getInstance } from "./core";
import type { ActraWasmExports, ActraWasmModule, WasmInput } from "./types";

type LoaderEnv = {
  fetch?: (input: string | URL) => Promise<Response>;
  readFile?: (input: string | URL) => Promise<ArrayBuffer>;
};

export async function loadActraWasmShared(
  input: WasmInput,
  env: LoaderEnv
): Promise<ActraWasmModule> {

  const imports: WebAssembly.Imports = {
    env: {
      abort: () => {
        throw new ActraError("Actra runtime engine import aborted");
      }
    }
  };


  function isResponseLike(input: unknown): input is Response {
    return (
      typeof input === "object" &&
      input !== null &&
      typeof (input as any).arrayBuffer === "function" &&
      typeof (input as any).headers === "object"
    );
  }

  try {
    let instance: WebAssembly.Instance;

    if (input instanceof Promise) {
      return loadActraWasmShared(await input, env);
    }

    // Response
    if (isResponseLike(input)) {
      if (typeof WebAssembly.instantiateStreaming === "function") {
        const res =
          typeof (input as any).clone === "function"
            ? input.clone()
            : input;

        try {
          const result =
            await WebAssembly.instantiateStreaming(res, imports);

          instance = getInstance(result);
        } catch {
          const bytes = await input.arrayBuffer();
          instance = await instantiate(bytes, imports);
        }
      } else {
        const bytes = await input.arrayBuffer();
        instance = await instantiate(bytes, imports);
      }
    }

    // ArrayBuffer
    else if (input instanceof ArrayBuffer) {
      instance = await instantiate(input, imports);
    }

    // Module
    else if (input instanceof WebAssembly.Module) {
      const result = await WebAssembly.instantiate(input, imports);
      instance = getInstance(result);
    }

    // URL / string
    else if (typeof input === "string" || input instanceof URL) {
      const fetchFn = env.fetch;

      // browser / worker / edge fetch path
      if (fetchFn) {
        try {
          const res = await fetchFn(input);
          return loadActraWasmShared(res, env);
        } catch (err) {
          if (!(err instanceof TypeError)) {
            throw err;
          }
        }
      }

      // node fs path
      if (env.readFile) {
        try {
          const bytes = await env.readFile(input);
          instance = await instantiate(bytes, imports);
        } catch (err: any) {
          throw new ActraError(
            `Failed to load Actra WASM via fetch or fs: ${err?.message || err}`
          );
        }
      } else {
        throw new ActraError(
          "File loading is not supported in this environment"
        );
      }
    }

    else {
      throw new ActraError("Unsupported WASM input type");
    }

    // validation
    const exports = instance.exports as unknown as ActraWasmExports;
    const memory = exports.memory;

    if (!memory) {
      throw new ActraError("Actra runtime engine memory export not found");
    }

    const required = [
      "actra_create",
      "actra_evaluate",
      "actra_compiler_version",
      "actra_buffer_from_js",
      "actra_buffer_free"
    ];

    for (const fn of required) {
      if (typeof (exports as any)[fn] !== "function") {
        throw new ActraError(`Missing Actra runtime engine export: ${fn}`);
      }
    }

    return { exports, memory };

  } catch (err: any) {
    if (err instanceof Error) {
      throw new ActraError(
        `Actra runtime engine load failed: ${err.message}`
      );
    }

    throw new ActraError(
      `Actra runtime engine load failed: ${String(err)}`
    );
  }
}