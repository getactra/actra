async function run() {
  const el = document.getElementById("output");

  try {
    el.textContent = "Loading WASM...";

    const wasm = await import("../../pkg/bundler/actra_wasm.js");

    const version = wasm.Actra.compiler_version();

    el.textContent = "Compiler Version: " + version;
  } catch (err) {
    console.error(err);
    el.textContent = "Error loading WASM";
  }
}

run();