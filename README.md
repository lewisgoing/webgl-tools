# WebGL Debugging Toolkit

A comprehensive, production-ready WebGL debugging and profiling toolkit that works with WebGL1 & WebGL2, raw GL and Three.js, with minimal overhead and safe fallbacks.

**[Live Demo](https://webgltools.vercel.app)** | **[npm Packages](https://www.npmjs.com/org/webgltools)**

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

```bash
# Using pnpm (recommended)
pnpm add @webgltools/core

# Using npm
npm install @webgltools/core

# Using yarn
yarn add @webgltools/core
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

- **`off`**: No instrumentation (production)
- **`sampled`**: Probabilistic sampling for low-overhead monitoring
- **`full`**: Complete instrumentation for development debugging

## Package Structure

- `@webgltools/core` - Core debugging functionality
- `@webgltools/overlay` - React-based visual overlay
- `@webgltools/three-adapter` - Three.js integration
- `@webgltools/spector-bridge` - Spector.js metadata support

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