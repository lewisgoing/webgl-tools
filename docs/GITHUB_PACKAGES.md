# GitHub Packages Setup

This guide explains how to set up and use GitHub Packages for the WebGL Tools project.

## Overview

The project is configured to publish packages to both:
- **npm Registry** (primary) - for public distribution
- **GitHub Packages** (mirror) - for GitHub integration and backup

## Automatic Publishing

### On Release

When you create a new GitHub Release, the packages are automatically published to both registries.

1. Create a release on GitHub
2. The `publish-packages.yml` workflow automatically:
   - Builds all packages
   - Publishes to npm registry
   - Publishes to GitHub Packages

### Manual Publishing

You can manually trigger publishing through GitHub Actions:

1. Go to Actions tab
2. Select "Publish Packages" workflow
3. Click "Run workflow"
4. Enter the version to publish

## Setup Requirements

### 1. NPM Token

For publishing to npm registry:

1. Create an npm access token at https://www.npmjs.com/settings/your-username/tokens
2. Add it as a repository secret named `NPM_TOKEN`:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

### 2. GitHub Token

The `GITHUB_TOKEN` is automatically provided by GitHub Actions for publishing to GitHub Packages.

## Installing from GitHub Packages

To install packages from GitHub Packages instead of npm:

### 1. Create `.npmrc` file

```bash
@webgltools:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### 2. Install packages

```bash
npm install @webgltools/core
npm install @webgltools/overlay
npm install @webgltools/three-adapter
```

## Using Changesets for Version Management

This project uses changesets for version management:

### Adding a changeset

When you make changes to packages:

```bash
pnpm changeset
```

Follow the prompts to:
1. Select which packages changed
2. Choose the version bump type (patch/minor/major)
3. Write a summary of changes

### Creating a release

The release workflow automatically:
1. Creates a PR with version updates when changesets are detected
2. Updates package versions
3. Updates changelogs
4. Publishes packages when the PR is merged

## Workflow Files

### `.github/workflows/publish-packages.yml`

Handles publishing to both npm and GitHub Packages:
- Triggered on release creation
- Can be manually triggered
- Publishes all packages in correct order

### `.github/workflows/release.yml`

Manages the release process with changesets:
- Triggered on push to main
- Creates release PRs
- Handles version management

## Package Configuration

Each package includes:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

This ensures packages are published publicly to both registries.

## Best Practices

1. **Always use changesets** for version bumps
2. **Create releases** through GitHub UI for production releases
3. **Test locally** before publishing
4. **Keep tokens secure** - never commit them to the repository

## Troubleshooting

### Publishing fails with 401

- Check that `NPM_TOKEN` is set correctly in repository secrets
- Ensure the token has publish permissions

### Package not found in GitHub Packages

- Packages are scoped to the repository owner
- Ensure you're using the correct scope: `@webgltools`

### Version conflicts

- Use changesets to manage versions consistently
- Don't manually edit version numbers in package.json