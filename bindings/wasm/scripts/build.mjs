import fs from "fs/promises";
import path from "path";

const src = path.resolve(
  "../../target/wasm32-unknown-unknown/release/actra_wasm.wasm"
);

// destinations
const targets = [
  "./test/actra_wasm.wasm",
  "./test/webpack/actra_wasm.wasm"
];

for (const dest of targets) {
  const out = path.resolve(dest);

  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(src, out);

  console.log("Copied WASM ->", dest);
}