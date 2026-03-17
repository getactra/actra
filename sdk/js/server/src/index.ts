import { initializeWasmEngine } from "./engine"
import { setInitPromise } from "@actra/common"

// Start initialization immediately
const ready = initializeWasmEngine()

// Register it with core so Actra can await it internally
setInitPromise(ready)

// Optional: surface errors (non-blocking)
ready.catch(err => {
  console.error("Actra engine initialization failed", err)
})

// Optional export (advanced usage)
export const actraReady = ready

export * from "@actra/common"