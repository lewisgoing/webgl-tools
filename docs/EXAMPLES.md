# Examples

## Basic WebGL Integration

```javascript
import { WebGLDebugger } from '@webgl-tools/core';

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

// Initialize debugger
const debug = new WebGLDebugger(gl, { 
  mode: 'sampled',
  sampleRate: 0.3 
});

// Render loop
function render() {
  debug.beginFrame();
  
  // Clear
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Draw
  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  
  debug.endFrame();
  
  // Log metrics every second
  if (debug.getSnapshot().frameId % 60 === 0) {
    console.log(debug.getSnapshot());
  }
  
  requestAnimationFrame(render);
}
```

## Three.js Integration

```javascript
import * as THREE from 'three';
import { WebGLDebugger } from '@webgl-tools/core';
import { attachThreeAdapter } from '@webgl-tools/three-adapter';
import { mountOverlay } from '@webgl-tools/overlay';

// Setup Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Attach debugger
const gl = renderer.getContext();
const debug = new WebGLDebugger(gl, { mode: 'full' });
attachThreeAdapter(renderer, debug);

// Mount debug overlay
mountOverlay(debug, {
  panels: ['stats', 'resources', 'timers']
});

// Add geometry
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Render loop
function animate() {
  debug.beginFrame();
  
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  renderer.render(scene, camera);
  
  debug.endFrame();
  requestAnimationFrame(animate);
}
animate();
```

## Advanced Shader Debugging

```javascript
import { WebGLDebugger, ShaderErrorFormatter } from '@webgl-tools/core';

const debug = new WebGLDebugger(gl);

// Compile shader with error handling
function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const formatted = ShaderErrorFormatter.formatShaderError(
      source, 
      log, 
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    );
    
    console.error(formatted.formattedOutput);
    
    // Show line-by-line errors
    formatted.errors.forEach(error => {
      console.error(`Line ${error.line}: ${error.message}`);
    });
    
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}
```

## FBO Inspection

```javascript
import { FBOInspector } from '@webgl-tools/core';

const inspector = new FBOInspector(gl);

// Create and render to FBO
const fbo = gl.createFramebuffer();
const texture = gl.createTexture();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

// Render scene to FBO
renderSceneToFBO();

// Capture and analyze
const imageData = inspector.captureFramebuffer(fbo);
const histogram = inspector.createHistogram(fbo, 'luminance');

// Save as image
const blob = await inspector.captureAsBlob(fbo, 'image/png');
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'framebuffer.png';
link.click();

// Inspect specific pixel
canvas.addEventListener('click', (e) => {
  const pixel = inspector.inspectPixel(e.offsetX, e.offsetY);
  console.log(`Color at (${e.offsetX}, ${e.offsetY}):`, pixel);
});
```

## Performance Profiling

```javascript
import { PerformanceProfiler } from '@webgl-tools/core';

const profiler = new PerformanceProfiler(gl);

// Run comprehensive benchmark
console.log('Running performance benchmark...');
const profile = await profiler.generateProfile();

// Display results
console.log('Device:', profile.deviceInfo);
console.log('Triangle Rate:', profile.performance.triangleRate.toLocaleString(), 'vertices/sec');
console.log('Fill Rate:', profile.performance.fillRate.toLocaleString(), 'pixels/sec');
console.log('Texture Upload:', (profile.performance.textureUploadRate / 1e6).toFixed(2), 'MB/sec');

// Generate report
const htmlReport = profiler.generateHTMLReport(profile);
const reportWindow = window.open('', '_blank');
reportWindow.document.write(htmlReport);

// Export for analysis
const json = profiler.exportProfile(profile);
console.log('Profile data:', JSON.parse(json));
```

## Production Monitoring

```javascript
import { WebGLDebugger } from '@webgl-tools/core';

// Minimal overhead sampling
const debug = new WebGLDebugger(gl, { 
  mode: 'sampled',
  sampleRate: 0.1  // Sample 10% of frames
});

// Send metrics to analytics
setInterval(() => {
  const snapshot = debug.getSnapshot();
  
  // Send to analytics service
  analytics.track('webgl_metrics', {
    fps: snapshot.fps,
    drawCalls: snapshot.drawCalls,
    triangles: snapshot.triangles,
    gpuMs: snapshot.gpuMs || 0,
    memoryMB: debug.getResources().estBytes / 1024 / 1024
  });
}, 5000); // Every 5 seconds

// Monitor for performance issues
function checkPerformance() {
  const snapshot = debug.getSnapshot();
  
  if (snapshot.fps < 30) {
    console.warn('Low FPS detected:', snapshot.fps);
  }
  
  if (snapshot.drawCalls > 1000) {
    console.warn('High draw call count:', snapshot.drawCalls);
  }
  
  const resources = debug.getResources();
  if (resources.estBytes > 500 * 1024 * 1024) {
    console.warn('High memory usage:', (resources.estBytes / 1024 / 1024).toFixed(2), 'MB');
  }
}
```

## Custom Pass Tracking

```javascript
import { EnhancedGPUTimers } from '@webgl-tools/core';

const timers = new EnhancedGPUTimers(gl);

function renderFrame() {
  // Shadow pass
  timers.beginPass('Shadow Rendering', { 
    resolution: shadowMapSize,
    cascades: 4 
  });
  renderShadowMaps();
  timers.endPass();
  
  // Geometry pass
  timers.beginPass('Geometry Pass');
  renderGeometry();
  timers.endPass();
  
  // Lighting pass
  timers.beginPass('Lighting Pass', {
    lights: activeLights.length
  });
  renderLighting();
  timers.endPass();
  
  // Post-processing
  timers.beginPass('Post Processing');
  renderPostEffects();
  timers.endPass();
  
  // Get bottlenecks
  const bottlenecks = timers.getBottlenecks(3);
  bottlenecks.forEach(b => {
    console.log(`${b.label}: ${b.avgMs.toFixed(2)}ms`);
  });
}
```