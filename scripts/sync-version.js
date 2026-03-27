import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const cargoTomlPath = path.resolve(ROOT, "Cargo.toml");

const packages = [
  "sdk/js/actra/package.json",
];

const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");

const match = cargoToml.match(/^version\s*=\s*"(.*)"/m);
if (!match) {
  console.error("Could not find version in Cargo.toml");
  process.exit(1);
}

const version = match[1];

console.log(`Syncing version: ${version}`);

for (const pkgPath of packages) {
  const fullPath = path.resolve(ROOT, pkgPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Skipping missing package: ${pkgPath}`);
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  pkg.version = version;

  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`Updated: ${pkgPath}`);
}

console.log("Version sync complete");