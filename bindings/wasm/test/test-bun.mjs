async function run() {
    try {
        const wasm = await import("../pkg/node/actra_wasm.js");
        const version = wasm.Actra.compiler_version();
        console.log("Actra WASM compiler version:", version);
    } catch (err) {
        console.error(err);
    }
}

run();