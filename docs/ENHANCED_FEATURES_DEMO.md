# Enhanced WebGL Tools - Feature Demos

## 🎨 Enhanced Shader Error Display

```typescript
import { ShaderErrorFormatter } from '@webgl-tools/core';

// When shader compilation fails
gl.shaderSource(shader, source);
gl.compileShader(shader);

if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  const infoLog = gl.getShaderInfoLog(shader) || '';
  const result = ShaderErrorFormatter.formatShaderError(
    source, 
    infoLog, 
    'fragment'
  );
  
  // Pretty console output
  console.log(result.formattedOutput);
  
  // Or HTML output for overlay
  const htmlError = ShaderErrorFormatter.formatShaderErrorHTML(
    source, 
    infoLog, 
    'fragment'
  );
  document.getElementById('errors').innerHTML = htmlError;
}
```

Output:
```
🔴 FRAGMENT SHADER COMPILATION FAILED
══════════════════════════════════════════════════

❌ Error 1/1 at line 15:
   'texture' : no matching overloaded function found

    12 | void main() {
    13 |   vec3 color = vec3(0.0);
    14 |   
  > 15 |   color = texture(uSampler);  // Error: missing UV coordinate
       ^^^
    16 |   
    17 |   gl_FragColor = vec4(color, 1.0);
    18 | }

──────────────────────────────────────────────────
💡 Tips:
   • Check uniform/varying declarations match between shaders
   • Verify all variables are declared before use
   • Ensure correct GLSL version syntax
```

## 🔍 FBO Inspector

```typescript
import { FBOInspector } from '@webgl-tools/core';

const inspector = new FBOInspector(gl);

// Capture current framebuffer as image
const imageData = inspector.captureFramebuffer();
// Display in canvas
ctx.putImageData(imageData, 0, 0);

// Inspect specific pixel value (great for GPGPU debugging)
const pixel = inspector.inspectPixel(100, 200);
console.log('Pixel value:', {
  rgba: pixel.rgba,        // Float values
  normalized: pixel.normalized, // 0-1 range
  hex: pixel.hex          // #RRGGBB format
});

// Compare two framebuffers (e.g., before/after post-processing)
const shadowMap = gl.createFramebuffer();
const blurredShadow = gl.createFramebuffer();
const diff = inspector.compareFramebuffers(shadowMap, blurredShadow);
// Shows differences in red

// Create histogram for analyzing value distribution
const histogram = inspector.createHistogram(framebuffer, 'luminance');
// Useful for tone mapping analysis

// Export framebuffer as image
const blob = await inspector.exportAsBlob(framebuffer, 'png');
const url = URL.createObjectURL(blob);
// Download or display
```

## ⏱️ Enhanced GPU Timers

```typescript
import { EnhancedGPUTimers } from '@webgl-tools/core';

const timers = new EnhancedGPUTimers(gl);

// Time individual passes
timers.beginPass('Shadow Map Generation');
renderShadowMap();
timers.endPass();

timers.beginPass('Main Render');
  
  // Time individual draw calls
  meshes.forEach((mesh, i) => {
    timers.timeDrawCall(
      () => gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0),
      {
        primitiveMode: 'TRIANGLES',
        vertexCount: mesh.count,
        shaderName: mesh.material.name,
        programId: mesh.material.programId
      }
    );
  });
  
timers.endPass();

timers.beginPass('Post Processing');
renderBloom();
timers.endPass();

// Poll for results
timers.poll();

// Get bottlenecks
const bottlenecks = timers.getBottlenecks(5);
console.table(bottlenecks);
// Output:
// ┌─────────┬──────────────────────┬───────┬────────┐
// │ (index) │ label                │ time  │ type   │
// ├─────────┼──────────────────────┼───────┼────────┤
// │ 0       │ 'Post Processing'    │ 12.5  │ 'pass' │
// │ 1       │ 'Shadow Map Gen'     │ 8.3   │ 'pass' │
// │ 2       │ 'Draw_45_TRIANGLES'  │ 2.1   │ 'draw' │
// └─────────┴──────────────────────┴───────┴────────┘

// Get timeline for visualization
const timeline = timers.getFrameTimeline();
// Can be used to create flame graph visualization
```

## 📊 Performance Profiler

```typescript
import { PerformanceProfiler } from '@webgl-tools/core';

const profiler = new PerformanceProfiler(gl);

// Generate comprehensive device profile
const profile = await profiler.generateProfile();

// Display key metrics
console.log('Device:', profile.deviceInfo.renderer);
console.log('Triangle Rate:', (profile.performance.triangleRate / 1e6).toFixed(1), 'M vertices/sec');
console.log('Fill Rate:', (profile.performance.fillRate / 1e9).toFixed(1), 'G pixels/sec');
console.log('Texture Upload:', (profile.performance.textureUploadRate / 1e6).toFixed(1), 'MB/sec');

// Generate HTML report
const htmlReport = profiler.generateHTMLReport(profile);
// Open in new window or save to file
const win = window.open();
win.document.write(htmlReport);

// Export as JSON for analysis
const jsonReport = profiler.exportProfile(profile);
// Send to analytics or save
```

## 🔗 Integration Example: Three.js

```typescript
import { 
  WebGLDebugger, 
  EnhancedGPUTimers,
  ShaderErrorFormatter,
  FBOInspector 
} from '@webgl-tools/core';

// Initialize with enhanced features
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
const debugger = new WebGLDebugger(gl, { mode: 'full' });

// Add enhanced timers
const timers = new EnhancedGPUTimers(gl);

// Create Three.js renderer with wrapped context
const renderer = new THREE.WebGLRenderer({ 
  canvas,
  context: gl,
  antialias: true
});

// Enhanced error handling
const originalCompileShader = gl.compileShader.bind(gl);
gl.compileShader = function(shader) {
  originalCompileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const source = gl.getShaderSource(shader) || '';
    const log = gl.getShaderInfoLog(shader) || '';
    const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
    
    const result = ShaderErrorFormatter.formatShaderError(
      source,
      log,
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    );
    
    console.error(result.formattedOutput);
  }
};

// Animation loop with enhanced timing
function animate() {
  requestAnimationFrame(animate);
  
  debugger.beginFrame();
  timers.resetFrame();
  
  // Time shadow pass
  timers.beginPass('Shadows', { resolution: shadowMapSize });
  renderer.shadowMap.render();
  timers.endPass();
  
  // Time main render with per-mesh timing
  timers.beginPass('Main Scene');
  scene.traverse(obj => {
    if (obj.isMesh) {
      timers.begin(`Mesh_${obj.name}`, 'draw', {
        geometry: obj.geometry.name,
        material: obj.material.name
      });
    }
  });
  
  renderer.render(scene, camera);
  timers.endPass();
  
  // Time post processing
  timers.beginPass('Post Effects');
  composer.render();
  timers.endPass();
  
  debugger.endFrame();
  timers.poll();
  
  // Log bottlenecks every 60 frames
  if (debugger.getSnapshot().frameId % 60 === 0) {
    const bottlenecks = timers.getBottlenecks(3);
    if (bottlenecks.length > 0) {
      console.log('Top GPU bottlenecks:', bottlenecks);
    }
  }
}
```

## 🎯 Custom Metrics Plugin

```typescript
// Register custom metrics for your specific use case
debugger.registerPlugin({
  name: 'PhysicsMetrics',
  
  metrics: {
    physicsTime: () => physics.lastStepTime,
    activeBodies: () => physics.world.bodies.length,
    collisionPairs: () => physics.world.contacts.length
  },
  
  // Custom timeline events
  onFrameBegin: () => {
    timers.begin('Physics Step', 'custom');
  },
  
  onFrameEnd: () => {
    timers.end();
  }
});
```

## 🌐 Remote Debugging (Future Enhancement)

```typescript
// Connect to remote device for debugging
const remoteDebugger = new RemoteWebGLDebugger({
  url: 'ws://192.168.1.100:9090',
  sessionId: 'mobile-test-001'
});

// Mirror all GL calls to remote
remoteDebugger.attach(gl);

// View real-time metrics on desktop while running on mobile
remoteDebugger.on('stats', stats => {
  updateDashboard(stats);
});

// Capture framebuffer from remote device
const remoteFBO = await remoteDebugger.captureFramebuffer();
```

These enhanced features transform the WebGL debugging toolkit into a professional-grade solution that rivals commercial offerings while remaining open source and extensible.