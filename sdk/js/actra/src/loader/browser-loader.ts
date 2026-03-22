import { loadActraWasmShared } from "./shared";

export function loadActraWasm(input) {
  return loadActraWasmShared(input, {
    fetch: (input) => fetch(input)
  });
}