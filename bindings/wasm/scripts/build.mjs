import { execSync } from "child_process";
import { rmSync, existsSync } from "fs";

const builds = [
  { target: "bundler", out: "pkg/bundler" },
  { target: "web", out: "pkg/web" },
  { target: "nodejs", out: "pkg/node" },
  { target: "deno", out: "pkg/deno" }
];

console.log("CWD:", process.cwd());

if (existsSync("pkg")) {
  console.log("\nCleaning pkg directory...");
  rmSync("pkg", { recursive: true, force: true });
}

for (const b of builds) {
  console.log(`\nBuilding ${b.target}...`);
  execSync(
    `wasm-pack build . --target ${b.target} --out-dir ${b.out} --release`,
    { stdio: "inherit" }
  );
}