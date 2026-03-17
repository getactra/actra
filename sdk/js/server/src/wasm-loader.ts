let wasmModule: any;

export async function loadActraWasm() {
    if (!wasmModule) {
        wasmModule = await import("../pkg/server/actra_wasm.js");
    }

    return wasmModule;
}
