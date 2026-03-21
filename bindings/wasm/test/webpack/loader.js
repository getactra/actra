export async function loadActraWasm(path) {
  let instance;

  const imports = {
    env: {
      abort: () => {
        throw new Error("WASM abort");
      }
    }
  };

  // 1. Deno
  if (typeof Deno !== "undefined" && typeof Deno.readFile === "function") {
    const bytes = await Deno.readFile(path);
    const result = await WebAssembly.instantiate(bytes, imports);
    instance = result.instance;
  }

  // 2. Node / Bun
  else if (typeof process !== "undefined" && process.versions?.node) {
    const fs = await import("fs/promises");
    const bytes = await fs.readFile(path);

    const result = await WebAssembly.instantiate(bytes, imports);
    instance = result.instance;
  }

  // 3. Browser / Workers / Edge
  else {
    const res = await fetch(path);

    if (!res.ok) {
      throw new Error(`Failed to fetch WASM: ${res.status}`);
    }

    // Try streaming first (fast path)
    if (WebAssembly.instantiateStreaming) {
      try {
        const result = await WebAssembly.instantiateStreaming(res, imports);
        instance = result.instance;
      } catch {
        // Fallback if MIME type is wrong
        const bytes = await res.arrayBuffer();
        const result = await WebAssembly.instantiate(bytes, imports);
        instance = result.instance;
      }
    } else {
      const bytes = await res.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, imports);
      instance = result.instance;
    }
  }

  return {
    exports: instance.exports,
    memory: instance.exports.memory
  };
}