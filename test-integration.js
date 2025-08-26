const { WebGLDebugger } = require('./packages/core/dist/index.js');

// Create a mock canvas and WebGL context
const canvas = {
  addEventListener: () => {},
  removeEventListener: () => {},
  width: 800,
  height: 600
};

// Create mock GL context
const gl = {
  POINTS: 0x0000,
  LINES: 0x0001,
  LINE_LOOP: 0x0002,
  LINE_STRIP: 0x0003,
  TRIANGLES: 0x0004,
  TRIANGLE_STRIP: 0x0005,
  TRIANGLE_FAN: 0x0006,
  
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  
  UNSIGNED_BYTE: 0x1401,
  UNSIGNED_SHORT: 0x1403,
  UNSIGNED_INT: 0x1405,
  FLOAT: 0x1406,
  
  RGB: 0x1907,
  RGBA: 0x1908,
  
  STATIC_DRAW: 0x88E4,
  TEXTURE_2D: 0x0DE1,
  
  getExtension: () => null,
  
  drawArrays: function(mode, first, count) {
    console.log(`drawArrays called: mode=${mode}, count=${count}`);
  },
  
  drawElements: function(mode, count, type, offset) {
    console.log(`drawElements called: mode=${mode}, count=${count}`);
  },
  
  createBuffer: () => ({ _id: Math.random() }),
  deleteBuffer: () => {},
  bindBuffer: () => {},
  bufferData: function(target, sizeOrData, usage) {
    const size = typeof sizeOrData === 'number' ? sizeOrData : sizeOrData.byteLength;
    console.log(`bufferData called: size=${size}`);
  },
  
  createTexture: () => ({ _id: Math.random() }),
  deleteTexture: () => {},
  bindTexture: () => {},
  texImage2D: function(...args) {
    if (args.length >= 9) {
      const width = args[3];
      const height = args[4];
      console.log(`texImage2D called: ${width}x${height}`);
    }
  },
  
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
};

console.log('Creating WebGL dbg...');
const dbg = new WebGLDebugger(gl, { mode: 'full' });

console.log('\nTesting draw calls...');
dbg.beginFrame();

// Simulate drawing 100 boxes (12 triangles each)
for (let i = 0; i < 100; i++) {
  gl.drawArrays(gl.TRIANGLES, 0, 36); // 36 vertices = 12 triangles
}

dbg.endFrame();

const stats1 = dbg.getStats();
console.log('\nAfter 100 boxes:');
console.log('Draw calls:', stats1.drawCalls);
console.log('Triangles:', stats1.tris);
console.log('Expected triangles:', 100 * 12);

// Reset and test with 500 boxes
dbg.resetStats();
dbg.beginFrame();

for (let i = 0; i < 500; i++) {
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

dbg.endFrame();

const stats2 = dbg.getStats();
console.log('\nAfter 500 boxes:');
console.log('Draw calls:', stats2.drawCalls);
console.log('Triangles:', stats2.tris);
console.log('Expected triangles:', 500 * 12);

// Test memory tracking
console.log('\nTesting memory tracking...');
const resources1 = dbg.getResourceInfo();
console.log('Initial memory:', resources1.estBytes, 'bytes');

// Create some buffers
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(1000), gl.STATIC_DRAW);

const resources2 = dbg.getResourceInfo();
console.log('After buffer upload:', resources2.estBytes, 'bytes');
console.log('Expected:', 1000 * 4, 'bytes');

// Create texture
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

const resources3 = dbg.getResourceInfo();
console.log('After texture upload:', resources3.estBytes, 'bytes');
console.log('Expected additional:', 256 * 256 * 4, 'bytes');

console.log('\nResource counts:');
console.log('Buffers:', resources3.byKind.buffer);
console.log('Textures:', resources3.byKind.texture);

console.log('\n✅ Integration test complete!');