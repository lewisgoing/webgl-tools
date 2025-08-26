// Test Three.js integration with WebGL debugger
const { WebGLDebugger } = require('./packages/core/dist/index.js');

// Mock canvas
const canvas = {
  addEventListener: () => {},
  removeEventListener: () => {},
  width: 800,
  height: 600
};

// Create real-ish mock GL context
let drawCallCount = 0;
const gl = {
  TRIANGLES: 0x0004,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88E4,
  TEXTURE_2D: 0x0DE1,
  UNSIGNED_BYTE: 0x1401,
  FLOAT: 0x1406,
  RGB: 0x1907,
  RGBA: 0x1908,
  
  getExtension: () => null,
  createBuffer: () => ({ _id: Math.random() }),
  deleteBuffer: () => {},
  bindBuffer: () => {},
  bufferData: () => {},
  createTexture: () => ({ _id: Math.random() }),
  deleteTexture: () => {},
  bindTexture: () => {},
  texImage2D: () => {},
  createShader: () => ({ _id: Math.random() }),
  deleteShader: () => {},
  createProgram: () => ({ _id: Math.random() }),
  deleteProgram: () => {},
  useProgram: () => {},
  createFramebuffer: () => ({ _id: Math.random() }),
  deleteFramebuffer: () => {},
  createRenderbuffer: () => ({ _id: Math.random() }),
  deleteRenderbuffer: () => {},
  bufferSubData: () => {},
  getParameter: () => 0,
  getError: () => 0,
  
  drawArrays: function(mode, first, count) {
    drawCallCount++;
    console.log(`Original drawArrays called: mode=${mode}, count=${count}`);
  },
  
  drawElements: function(mode, count, type, offset) {
    drawCallCount++;
    console.log(`Original drawElements called: mode=${mode}, count=${count}`);
  },
};

console.log('Creating WebGL debugger...');
const dbg = new WebGLDebugger(gl, { mode: 'full' });

console.log('\nTesting if GL methods are wrapped...');
console.log('gl.drawArrays is wrapped:', gl.drawArrays !== dbg.gl.drawArrays);
console.log('Type of gl.drawArrays:', typeof gl.drawArrays);

// Reset counters
drawCallCount = 0;
dbg.resetStats();
dbg.beginFrame();

console.log('\nSimulating Three.js draw calls...');
// Simulate what Three.js does
for (let i = 0; i < 10; i++) {
  gl.drawArrays(gl.TRIANGLES, 0, 36); // Draw a box
}

dbg.endFrame();

console.log('\nResults:');
console.log('Original draw calls intercepted:', drawCallCount);

const stats = dbg.getStats();
console.log('Debugger stats:');
console.log('- Draw calls:', stats.drawCalls);
console.log('- Triangles:', stats.tris);
console.log('- Expected triangles:', 10 * 12);

console.log('\nChecking if wrapping works correctly...');
// Direct test
dbg.resetStats();
gl.drawArrays(gl.TRIANGLES, 0, 3); // Single triangle
const stats2 = dbg.getStats();
console.log('After single triangle: draw calls =', stats2.drawCalls, ', triangles =', stats2.tris);