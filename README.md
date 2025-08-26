# WebGL Debugging Toolkit

A production-ready WebGL debugging toolkit that works with WebGL1 & WebGL2, raw GL and Three.js, with minimal overhead and safe fallbacks.

## Setup

```bash
# Install dependencies and build packages
./setup.sh

# Or manually:
pnpm install
pnpm build:packages
```

## Running the Playground

```bash
# Run the interactive playground
pnpm dev:playground

# Visit http://localhost:3000
```

## Quick Start

```ts
import { WebGLDebugger } from '@webgl-tools/core';

// 1) Get GL
const canvas = document.querySelector('canvas')!;
const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext;

// 2) Start debugger
const debug = new WebGLDebugger(gl, { mode: 'sampled', sampleRate: 0.3, logCreates: false });

// 3) Render loop
function render() {
  debug.beginFrame();

  // ... your rendering ...

  debug.endFrame();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 4) (Optional) Overlay
import('@webgl-tools/overlay').then(({ mountOverlay }) => mountOverlay(debug));
```

## Features

- **Stats**: FPS, CPU/GPU timing, draw calls, triangles, texture binds, shader switches
- **Resources**: Track creation/deletion with estimated memory usage
- **GPU Timers**: WebGL1 & WebGL2 support with disjoint checks
- **FBO Inspector**: Visualize render targets with float/depth support
- **Shader Errors**: Map errors back to source files with #line directives
- **Three.js Integration**: Drop-in adapter for Three.js projects
- **Low Overhead**: Sampled mode for production monitoring

## Modes

- `off`: No instrumentation (production)
- `sampled`: Probabilistic sampling (low overhead monitoring)
- `full`: Complete instrumentation (development debugging)

## Packages

- `@webgl-tools/core`: Core instrumentation and capability detection
- `@webgl-tools/overlay`: React overlay UI panels
- `@webgl-tools/three-adapter`: Three.js integration
- `@webgl-tools/spector-bridge`: Spector.js metadata helpers
- `@webgl-tools/perfpage`: Device capability snapshot page

## Three.js Usage

```ts
import { WebGLDebugger } from '@webgl-tools/core';
import { attachThreeAdapter } from '@webgl-tools/three-adapter';

const renderer = new THREE.WebGLRenderer();
const gl = renderer.getContext();
const dbg = new WebGLDebugger(gl, { mode: 'full' });
attachThreeAdapter(renderer, dbg);
```

## License

MIT