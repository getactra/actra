# Install wasm target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Browser build
# wasm-pack build bindings/wasm --target web --out-dir pkg/web

# Node build
# wasm-pack build bindings/wasm --target nodejs --out-dir pkg/node

# Bundler
# wasm-pack build bindings/wasm --target bundler --out-dir pkg

# Optimize Linux
# sudo apt install binaryen

# Optimize Mac
# brew install binaryen

# Post pack 
# wasm-opt -Oz -o bindings/wasm/pkg/actra_wasm_bg.wasm bindings/wasm/pkg/actra_wasm_bg.wasm


### Release
# 1. Browser build
wasm-pack build bindings/wasm --target web --out-dir pkg/web --release

# 2. Server build
wasm-pack build bindings/wasm --target nodejs --out-dir pkg/server --release

# cargo install wasm-opt

# Optimize wasm, option #1
wasm-opt -Oz \
  -o bindings/wasm/pkg/actra_wasm_bg.wasm \
  bindings/wasm/pkg/actra_wasm_bg.wasm

# Optimize all, option #2
wasm-opt -Oz \
  --strip-debug \
  --strip-producers \
  -o bindings/wasm/pkg/all/actra_wasm_bg.wasm \
  bindings/wasm/pkg/all/actra_wasm_bg.wasm

  # Optimize web, option #2
wasm-opt -Oz \
  --strip-debug \
  --strip-producers \
  -o bindings/wasm/pkg/web/actra_wasm_bg.wasm \
  bindings/wasm/pkg/web/actra_wasm_bg.wasm
  
cd sdk/js
npm install
npm run build

#Publish