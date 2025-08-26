# Deployment Guide

## Prerequisites

The packages must be published to npm first before deploying the playground to Vercel.

## Step 1: Publish Packages to npm

```bash
# Make sure you're logged into npm
npm login

# Run the publish script
./scripts/publish.sh
```

## Step 2: Deploy Playground to Vercel

After the packages are published to npm, you can deploy the playground:

### Option A: Deploy via CLI

```bash
cd apps/playground

# For production deployment
vercel --prod

# For preview deployment
vercel
```

### Option B: Connect GitHub Repository

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure:
   - Framework: Next.js
   - Root Directory: `apps/playground`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

## Alternative: Deploy without Publishing (Development)

If you want to test deployment without publishing to npm:

1. Build all packages locally:
   ```bash
   pnpm build
   ```

2. Create a standalone Next.js app with the built files
3. Deploy that standalone app

## Troubleshooting

### "No matching version found" Error

This happens when trying to deploy before publishing packages to npm. The playground depends on `@webgltools/*` packages which need to be available on npm.

### Monorepo Issues

Vercel sometimes has issues with pnpm workspaces. If you encounter problems:

1. Make sure all packages are published to npm
2. Use the production package.json that references npm packages instead of workspace packages
3. Consider deploying from a separate repository with just the playground code