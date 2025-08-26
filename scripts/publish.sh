#!/bin/bash

# Publishing script for @webgltools packages

echo "Publishing @webgltools packages..."
echo "=================================="

# Check if user is logged in
if ! npm whoami > /dev/null 2>&1; then
    echo "Error: You need to login to npm first!"
    echo "Run: npm login"
    exit 1
fi

echo "Logged in as: $(npm whoami)"
echo ""

# Function to publish a package
publish_package() {
    local package_path=$1
    local package_name=$2
    
    echo "Publishing $package_name..."
    cd "$package_path" || exit 1
    
    # Check if already published
    if npm view "$package_name" version > /dev/null 2>&1; then
        echo "Warning: $package_name is already published. Skipping..."
    else
        npm publish --access public
        if [ $? -eq 0 ]; then
            echo "✅ $package_name published successfully!"
        else
            echo "❌ Failed to publish $package_name"
            exit 1
        fi
    fi
    
    cd - > /dev/null
    echo ""
}

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Publish packages in order
publish_package "$ROOT_DIR/packages/core" "@webgltools/core"
publish_package "$ROOT_DIR/packages/three-adapter" "@webgltools/three-adapter"
publish_package "$ROOT_DIR/packages/spector-bridge" "@webgltools/spector-bridge"
publish_package "$ROOT_DIR/packages/overlay" "@webgltools/overlay"

echo "=================================="
echo "All packages published successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy playground to Vercel: cd apps/playground && vercel --prod"
echo "2. Create a GitHub release"
echo "3. Update documentation"