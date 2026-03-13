#!/bin/bash

ROOT_DIR="$1"

if [ -z "$ROOT_DIR" ]; then
  echo "Usage: $0 <example_folder_path>"
  exit 1
fi

find "$ROOT_DIR" -type f -name "*.py" | while read file; do
  echo "Running $file"
  python3 "$file"
done