# @webgltools/core

Core WebGL debugging and profiling functionality for the WebGL Debugging Toolkit.

## Installation

```bash
npm install @webgltools/core
# or
yarn add @webgltools/core
# or
pnpm add @webgltools/core
```

## Features

- Real-time performance metrics (FPS, draw calls, triangles)
- WebGL resource tracking with memory estimation
- GPU timer queries (WebGL1 & WebGL2)
- Shader error formatting with source highlighting
- Framebuffer inspection and analysis
- Performance profiling and benchmarking
- Low-overhead sampling mode for production

## Quick Start

```typescript
import { WebGLDebugger } from '@webgltools/core';

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

const debug = new WebGLDebugger(gl, { 
  mode: 'sampled',
  sampleRate: 0.3 
});

function render() {
  debug.beginFrame();
  
  // Your WebGL rendering code
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  
  debug.endFrame();
  
  const stats = debug.getSnapshot();
  console.log(`FPS: ${stats.fps}, Draw Calls: ${stats.drawCalls}`);
  
  requestAnimationFrame(render);
}
```

## Documentation

See the [main repository](https://github.com/lewisgoing/webgl-tools) for full documentation.

## License

MIT