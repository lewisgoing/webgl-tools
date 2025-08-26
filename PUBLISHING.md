# Publishing Instructions

## Prerequisites

1. Make sure you're logged into npm with the correct account:
```bash
npm whoami
```

If not logged in, use:
```bash
npm login
```

2. Ensure you have access to the @webgltools organization on npm.

## Publishing Packages

The packages need to be published in the correct order due to dependencies:

### 1. First, publish core package:
```bash
cd packages/core
npm publish --access public
```

### 2. Then publish the adapter packages:
```bash
cd ../three-adapter
npm publish --access public

cd ../spector-bridge
npm publish --access public
```

### 3. Finally, publish the overlay:
```bash
cd ../overlay
npm publish --access public
```

## Verify Publication

After publishing, verify the packages are available:
```bash
npm view @webgltools/core
npm view @webgltools/three-adapter
npm view @webgltools/overlay
npm view @webgltools/spector-bridge
```

## Deploy Playground to Vercel

1. Install Vercel CLI if not already installed:
```bash
npm i -g vercel
```

2. Deploy the playground:
```bash
cd apps/playground
vercel --prod
```

When prompted:
- Set up and deploy: Yes
- Which scope: Select your account or create "webgltools" team
- Link to existing project? No (first time) or Yes (updates)
- Project name: webgltools
- Directory: ./
- Override settings: No

The deployment will be available at: https://webgltools.vercel.app

## Post-Publishing

1. Update the README with npm badges
2. Create a GitHub release with changelog
3. Tweet about the release!