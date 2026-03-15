import { loadActra } from "./loader.js";

async function run() {
  const wasm = await loadActra();
  console.log("Actra WASM compiler version:", wasm.Actra.compiler_version());

}

run();