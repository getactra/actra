let wasmModule;

export async function loadActra() {
  if (!wasmModule) {
    if (typeof window !== "undefined") {
      // Browser
      wasmModule = await import("../pkg/web/actra_wasm.js");
      // Prefer default export init (common in wasm-pack)
      if (wasmModule.default) {
        await wasmModule.default();
      } else if (wasmModule.init) {
        await wasmModule.init();
      }
    } else {
      // Node, Bun, Cloudflare Workers, Lambda
      wasmModule = await import("../pkg/all/actra_wasm.js");
    }
  }

  return wasmModule;
}