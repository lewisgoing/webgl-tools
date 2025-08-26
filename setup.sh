#!/bin/bash

echo "🚀 Setting up WebGL Tools..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm@8.6.0"
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building packages..."
pnpm build:packages

echo "✅ Setup complete! You can now run:"
echo "   pnpm dev:playground    # Run the playground app"
echo "   pnpm dev              # Run all dev servers"
echo "   pnpm build            # Build all packages"