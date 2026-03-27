#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning previous builds..."
rm -rf target
rm -rf venv_test
rm -rf sdk/python/target wheelhouse

echo "Creating temporary Python virtualenv..."
python3 -m venv venv_test
source venv_test/bin/activate
pip install --upgrade pip
pip install maturin cibuildwheel

echo "Building wheels via cibuildwheel..."
# Build wheels for current OS only
export CIBW_BUILD="cp314-*"
export CIBW_BUILD_VERBOSITY=2
export CIBW_SKIP="pp* *-musllinux_i686 cp39-macosx_*"
export CIBW_ARCHS_MACOS="x86_64"
export MATURIN_BUILD_ARGS="--release --strip"
export CIBW_TEST_COMMAND="python -c 'import actra; print(\"actra imported from:\", actra.__file__)'" ## New for testing update in gha post test
export CIBW_ENVIRONMENT="PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1"

cibuildwheel sdk/python --output-dir wheelhouse

echo "Installing built wheel in temp venv..."
pip install --force-reinstall wheelhouse/*.whl

echo "Verifying import..."
python -c "import actra; print('actra imported from:', actra.__file__)"
python -c "import actra; print('actra version:', getattr(actra, '__version__', 'unknown'))"

echo "Local build test passed!"
