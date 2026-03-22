export async function loadActraWasm(input) {
  let instance;

  const imports = {
    env: {
      abort: () => {
        throw new Error("WASM abort");
      }
    }
  };

  const url = input;

  async function instantiate(bytes) {
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    return instance;
  }

  // runtime detection

  const isNode =
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node;

  const isDeno =
    typeof Deno !== "undefined" &&
    typeof Deno.readFile === "function";

  // load wasm

  try {
    // browser / workers / edge
    if (!isNode && !isDeno) {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch WASM: ${res.status}`);
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

    // deno
    else if (isDeno) {
      let bytes;

      if (url instanceof URL && url.protocol === "file:") {
        // requires: --allow-read
        bytes = await Deno.readFile(url);
      } else {
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch WASM: ${res.status}`);
        }

        bytes = await res.arrayBuffer();
      }

      instance = await instantiate(bytes);
    }

    // node / bun
    else {
      let bytes;

      if (url instanceof URL && url.protocol === "file:") {
        const fs = await import(
          /* webpackIgnore: true */ "fs/promises"
        );

        bytes = await fs.readFile(url);
      } else {
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch WASM: ${res.status}`);
        }

        bytes = await res.arrayBuffer();
      }

      instance = await instantiate(bytes);
    }
  } catch (err) {
    throw new Error(`WASM load failed: ${err.message}`);
  }

  const exports = instance.exports;
  const memory = exports.memory;

  // validation

  if (typeof exports.actra_create !== "function") {
    throw new Error("actra_create export not found");
  }

  try {
    const test = exports.actra_compiler_version();

    if (typeof test !== "bigint") {
      throw new Error(
        "WASM i64 is not mapped to BigInt. Use modern runtime."
      );
    }
  } catch (e) {
    throw new Error(
      "WASM BigInt support failed.\n" + e.message
    );
  }

  return { exports, memory };
}