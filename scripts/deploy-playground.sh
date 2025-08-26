#!/bin/bash

echo "Deploying WebGL Tools Playground to Vercel..."
echo "==========================================="

# Build everything first
echo "Building all packages..."
pnpm build

# Create a temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "Creating deployment directory: $TEMP_DIR"

# Copy playground files
cp -r apps/playground/* "$TEMP_DIR/"

# Copy built dependencies
mkdir -p "$TEMP_DIR/node_modules/@webgltools"
cp -r packages/core/dist "$TEMP_DIR/node_modules/@webgltools/core"
cp packages/core/package.json "$TEMP_DIR/node_modules/@webgltools/core/"

cp -r packages/overlay/dist "$TEMP_DIR/node_modules/@webgltools/overlay"
cp packages/overlay/package.json "$TEMP_DIR/node_modules/@webgltools/overlay/"

cp -r packages/three-adapter/dist "$TEMP_DIR/node_modules/@webgltools/three-adapter"
cp packages/three-adapter/package.json "$TEMP_DIR/node_modules/@webgltools/three-adapter/"

# Deploy from temp directory
cd "$TEMP_DIR"
vercel --prod

# Cleanup
cd -
rm -rf "$TEMP_DIR"

echo "Deployment complete!"