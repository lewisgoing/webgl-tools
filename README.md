# WebGL Debugging Toolkit

<div align="center">

[![npm version](https://img.shields.io/npm/v/@webgltools/core.svg?style=flat-square)](https://www.npmjs.com/package/@webgltools/core)
[![npm downloads](https://img.shields.io/npm/dm/@webgltools/core.svg?style=flat-square)](https://www.npmjs.com/package/@webgltools/core)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-published-blue.svg?style=flat-square)](https://github.com/lewisgoing?tab=packages&repo_name=webgl-tools)
[![License](https://img.shields.io/npm/l/@webgltools/core.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![WebGL](https://img.shields.io/badge/WebGL-1%20%26%202-green.svg?style=flat-square)](https://www.khronos.org/webgl/)

[![Chrome](https://img.shields.io/badge/Chrome-✓-success.svg?style=flat-square&logo=google-chrome&logoColor=white)](https://www.google.com/chrome/)
[![Firefox](https://img.shields.io/badge/Firefox-✓-success.svg?style=flat-square&logo=firefox&logoColor=white)](https://www.mozilla.org/firefox/)
[![Safari](https://img.shields.io/badge/Safari-✓-success.svg?style=flat-square&logo=safari&logoColor=white)](https://www.apple.com/safari/)
[![Edge](https://img.shields.io/badge/Edge-✓-success.svg?style=flat-square&logo=microsoft-edge&logoColor=white)](https://www.microsoft.com/edge)

<p align="center">
  <a href="https://webgltools.vercel.app">Live Demo</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Docs</a> •
  <a href="#enhanced-features-usage">Features</a>
</p>

</div>

A comprehensive, production-ready WebGL debugging and profiling toolkit that works with WebGL1 & WebGL2, raw GL and Three.js, with minimal overhead and safe fallbacks.

---

### See It In Action

```javascript
// 1. Import and initialize
import { WebGLDebugger } from '@webgltools/core';
const debug = new WebGLDebugger(gl, { mode: 'sampled' });

// 2. Wrap your render loop
function render() {
  debug.beginFrame();
  
  // Your WebGL code here
  gl.drawArrays(gl.TRIANGLES, 0, count);
  
  debug.endFrame();
  console.log(`FPS: ${debug.fps} | Draw Calls: ${debug.drawCalls}`);
}

// 3. Add visual overlay (optional)
import('@webgltools/overlay').then(({ mountOverlay }) => {
  mountOverlay(debug);
});
```

---

### Why WebGL Tools?

<table>
<tr>
<td>

**Ultra-Low Overhead**
<br>Smart sampling keeps your FPS high

</td>
<td>

**Deep Insights**
<br>GPU timers, memory tracking, draw analysis

</td>
<td>

**Framework Agnostic**
<br>Works with raw WebGL, Three.js, and more

</td>
<td>

**Production Ready**
<br>Safe fallbacks, no crashes, TypeScript

</td>
</tr>
</table>

---

## Features

### Core Debugging
- **Performance Metrics**: Real-time FPS, CPU/GPU timing, draw calls, triangles, texture binds, shader switches
- **Resource Tracking**: Monitor WebGL resource creation/deletion with estimated memory usage
- **GPU Timers**: Hardware-accelerated timing with WebGL1 & WebGL2 support
- **Low Overhead**: Sampled mode for production monitoring with minimal performance impact

### Enhanced Features
- **Shader Error Formatter**: Enhanced error messages with line-by-line source code highlighting
- **FBO Inspector**: Visualize render targets, capture framebuffers, analyze pixels with histogram support
- **Enhanced GPU Timers**: Hierarchical timing, per-draw-call metrics, bottleneck analysis
- **Performance Profiler**: Comprehensive device profiling, benchmark suite, HTML report generation

### Framework Support
- **Three.js Integration**: Drop-in adapter with automatic triangle counting
- **React Overlay**: Customizable debug panels with real-time updates
- **Spector.js Bridge**: Enhanced metadata for Spector.js integration

## Installation

Install from npm (recommended):


```bash
# Using pnpm (recommended)
pnpm add @webgltools/core

# Using npm
npm install @webgltools/core

# Using yarn
yarn add @webgltools/core
```

Or install from GitHub Packages:
```bash
# Configure npm to use GitHub Packages
echo "@webgltools:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install
npm install @webgltools/core
```

## Quick Start

```typescript
import { WebGLDebugger } from '@webgltools/core';

// 1. Get WebGL context
const canvas = document.querySelector('canvas')!;
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

// 2. Create debugger instance
const debug = new WebGLDebugger(gl, { 
  mode: 'sampled',      // 'off' | 'sampled' | 'full'
  sampleRate: 0.3,      // 30% sampling rate
  logCreates: false     // Log resource creation
});

// 3. Wrap your render loop
function render() {
  debug.beginFrame();
  
  // Your WebGL rendering code here
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  
  debug.endFrame();
  
  // Get metrics
  const snapshot = debug.getSnapshot();
  console.log(`FPS: ${snapshot.fps}, Draw Calls: ${snapshot.drawCalls}`);
  
  requestAnimationFrame(render);
}

// 4. Optional: Add visual overlay
import('@webgltools/overlay').then(({ mountOverlay }) => {
  mountOverlay(debug);
});
```

## Three.js Integration

```typescript
import { WebGLDebugger } from '@webgltools/core';
import { attachThreeAdapter } from '@webgltools/three-adapter';
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
const gl = renderer.getContext();
const debug = new WebGLDebugger(gl, { mode: 'full' });

// Attach adapter for accurate triangle counting
attachThreeAdapter(renderer, debug);

// Use as normal
function animate() {
  debug.beginFrame();
  renderer.render(scene, camera);
  debug.endFrame();
  requestAnimationFrame(animate);
}
```

## Enhanced Features Usage

### Shader Error Formatting

```typescript
import { ShaderErrorFormatter } from '@webgltools/core';

// Compile shader with enhanced error reporting
const shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(shader, shaderSource);
gl.compileShader(shader);

if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  const log = gl.getShaderInfoLog(shader);
  const formatted = ShaderErrorFormatter.formatShaderError(shaderSource, log, 'vertex');
  console.error(formatted.formattedOutput);
}
```

### FBO Inspector

```typescript
import { FBOInspector } from '@webgltools/core';

const inspector = new FBOInspector(gl);

// Capture current framebuffer
const imageData = inspector.captureFramebuffer();

// Save as image
const blob = await inspector.captureAsBlob(null, 'image/png');

// Analyze pixel at position
const pixel = inspector.inspectPixel(x, y);
console.log(`Color: ${pixel.hex}, RGB: ${pixel.rgba}`);

// Generate histogram
const histogram = inspector.createHistogram(null, 'luminance');
```

### Performance Profiling

```typescript
import { PerformanceProfiler } from '@webgltools/core';

const profiler = new PerformanceProfiler(gl);

// Run comprehensive benchmark
const profile = await profiler.generateProfile();

// Generate HTML report
const htmlReport = profiler.generateHTMLReport(profile);

// Export as JSON
const json = profiler.exportProfile(profile);
```

## Operating Modes

Choose the right mode for your use case:

| Mode | Performance Impact | Use Case | Features |
|------|-------------------|----------|----------|
| `off` | None | Production | No instrumentation |
| `sampled` | ~1-2% | Production monitoring | Statistical sampling |
| `full` | ~5-10% | Development | Complete tracking |

```javascript
// Production with monitoring
const debug = new WebGLDebugger(gl, { 
  mode: 'sampled',
  sampleRate: 0.1 // 10% sampling
});

// Development debugging
const debug = new WebGLDebugger(gl, { 
  mode: 'full',
  logCreates: true
});
```

## Package Structure

| Package | Description | Version |
|---------|-------------|---------|  
| [`@webgltools/core`](https://www.npmjs.com/package/@webgltools/core) | Core debugging functionality | ![npm](https://img.shields.io/npm/v/@webgltools/core.svg?style=flat-square) |
| [`@webgltools/overlay`](https://www.npmjs.com/package/@webgltools/overlay) | React-based visual overlay | ![npm](https://img.shields.io/npm/v/@webgltools/overlay.svg?style=flat-square) |
| [`@webgltools/three-adapter`](https://www.npmjs.com/package/@webgltools/three-adapter) | Three.js integration | ![npm](https://img.shields.io/npm/v/@webgltools/three-adapter.svg?style=flat-square) |
| [`@webgltools/spector-bridge`](https://www.npmjs.com/package/@webgltools/spector-bridge) | Spector.js metadata support | ![npm](https://img.shields.io/npm/v/@webgltools/spector-bridge.svg?style=flat-square) |

## Development

```bash
# Clone repository
git clone https://github.com/your-username/webgl-tools.git
cd webgl-tools

# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Run tests
pnpm test

# Run playground
pnpm dev:playground
```

## Testing

The toolkit includes comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Generate coverage report
pnpm test:coverage
```

## Documentation

- [Architecture Overview](docs/PLAN.md)
- [Testing Strategy](docs/TEST_PLAN.md)
- [Enhanced Features](docs/ENHANCEMENT_PLAN.md)
- [API Reference](docs/API.md) (coming soon)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Inspired by [Spector.js](https://github.com/BabylonJS/Spector.js)
- WebGL best practices from the [WebGL community](https://www.khronos.org/webgl/)
- Three.js integration patterns from the [Three.js](https://threejs.org/) ecosystem