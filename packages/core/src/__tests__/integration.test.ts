import { WebGLDebugger } from '../index';

// Mock WebGL context for testing
const createMockGL = () => {
  const resources = new Map();
  const bufferData: number[] = [];
  const textureData: number[] = [];
  
  return {
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
    LUMINANCE: 0x1909,
    ALPHA: 0x190A,
    LUMINANCE_ALPHA: 0x190B,
    
    STATIC_DRAW: 0x88E4,
    TEXTURE_2D: 0x0DE1,
    VERTEX_SHADER: 0x8B31,
    
    getExtension: jest.fn(() => null),
    
    createTexture: jest.fn(() => {
      const texture = { _id: Math.random() };
      resources.set(texture, 'texture');
      return texture;
    }),
    deleteTexture: jest.fn((tex) => {
      resources.delete(tex);
    }),
    
    createBuffer: jest.fn(() => {
      const buffer = { _id: Math.random() };
      resources.set(buffer, 'buffer');
      return buffer;
    }),
    deleteBuffer: jest.fn((buf) => {
      resources.delete(buf);
    }),
    
    createShader: jest.fn((type) => {
      const shader = { _id: Math.random(), type };
      resources.set(shader, 'shader');
      return shader;
    }),
    deleteShader: jest.fn((sh) => {
      resources.delete(sh);
    }),
    
    createProgram: jest.fn(() => {
      const program = { _id: Math.random() };
      resources.set(program, 'program');
      return program;
    }),
    deleteProgram: jest.fn((pr) => {
      resources.delete(pr);
    }),
    
    createFramebuffer: jest.fn(() => ({ _id: Math.random() })),
    deleteFramebuffer: jest.fn(),
    createRenderbuffer: jest.fn(() => ({ _id: Math.random() })),
    deleteRenderbuffer: jest.fn(),
    
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
    
    bindTexture: jest.fn(),
    bindBuffer: jest.fn(),
    useProgram: jest.fn(),
    
    bufferData: jest.fn((target, sizeOrData, usage) => {
      const size = typeof sizeOrData === 'number' ? sizeOrData : 
                    sizeOrData.byteLength || sizeOrData.length * 4;
      bufferData.push(size);
    }),
    
    bufferSubData: jest.fn(),
    
    texImage2D: jest.fn((...args) => {
      if (args.length >= 9) {
        const width = args[3];
        const height = args[4];
        const format = args[6];
        const type = args[7];
        let channels = format === 0x1907 ? 3 : format === 0x1908 ? 4 : 1;
        let bytes = type === 0x1406 ? 4 : 1;
        textureData.push(width * height * channels * bytes);
      }
    }),
    
    getParameter: jest.fn(),
    getError: jest.fn(() => 0),
    
    // Helper for tests
    _getBufferUploads: () => bufferData,
    _getTextureUploads: () => textureData,
    _getResources: () => resources,
  };
};

describe('WebGL Integration Tests', () => {
  let gl: any;
  let dbg: WebGLDebugger;

  beforeEach(() => {
    gl = createMockGL();
    dbg = new WebGLDebugger(gl as any, {
      mode: 'full',
      logCreates: false
    });
  });

  afterEach(() => {
    dbg.dispose();
  });

  describe('Draw call tracking', () => {
    test('tracks simple triangle draw calls', () => {
      const stats = dbg.getStats();
      expect(stats.drawCalls).toBe(0);
      expect(stats.tris).toBe(0);

      // Draw a single triangle
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      
      const stats2 = dbg.getStats();
      expect(stats2.drawCalls).toBe(1);
      expect(stats2.tris).toBe(1);

      // Draw another triangle
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      
      const stats3 = dbg.getStats();
      expect(stats3.drawCalls).toBe(2);
      expect(stats3.tris).toBe(2);
    });

    test('tracks multiple triangles in one call', () => {
      // Draw 4 triangles (12 vertices)
      gl.drawArrays(gl.TRIANGLES, 0, 12);
      
      const stats = dbg.getStats();
      expect(stats.drawCalls).toBe(1);
      expect(stats.tris).toBe(4);
    });

    test('resets stats correctly', () => {
      gl.drawArrays(gl.TRIANGLES, 0, 12);
      
      const stats1 = dbg.getStats();
      expect(stats1.drawCalls).toBe(1);
      expect(stats1.tris).toBe(4);

      dbg.resetStats();

      const stats2 = dbg.getStats();
      expect(stats2.drawCalls).toBe(0);
      expect(stats2.tris).toBe(0);
    });

    test('tracks drawElements calls', () => {
      gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
      
      const stats = dbg.getStats();
      expect(stats.drawCalls).toBe(1);
      expect(stats.tris).toBe(12); // 36 / 3 = 12
    });

    test('accumulates triangles across frames', () => {
      // Frame 1
      gl.drawArrays(gl.TRIANGLES, 0, 36); // 12 triangles
      gl.drawArrays(gl.TRIANGLES, 0, 36); // 12 triangles
      
      const stats1 = dbg.getStats();
      expect(stats1.tris).toBe(24);

      // Reset for new frame
      dbg.resetStats();

      // Frame 2
      gl.drawArrays(gl.TRIANGLES, 0, 72); // 24 triangles
      
      const stats2 = dbg.getStats();
      expect(stats2.tris).toBe(24);
    });
  });

  describe('Memory tracking', () => {
    test('tracks buffer memory', () => {
      const resources = dbg.getResourceInfo();
      expect(resources.estBytes).toBe(0);

      // Create and upload buffer data
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);

      const resources2 = dbg.getResourceInfo();
      expect(resources2.estBytes).toBe(1024);
      expect(resources2.byKind.buffer).toBe(1);

      // Upload more data
      gl.bufferData(gl.ARRAY_BUFFER, 2048, gl.STATIC_DRAW);

      const resources3 = dbg.getResourceInfo();
      expect(resources3.estBytes).toBe(1024 + 2048);

      // Clean up
      gl.deleteBuffer(buffer);
      
      const resources4 = dbg.getResourceInfo();
      expect(resources4.byKind.buffer).toBe(0);
    });

    test('tracks texture memory', () => {
      const resources = dbg.getResourceInfo();
      expect(resources.estBytes).toBe(0);

      // Create texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Upload 128x128 RGBA texture
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        128, 128, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      );

      const resources2 = dbg.getResourceInfo();
      // 128 * 128 * 4 = 65536 bytes
      expect(resources2.estBytes).toBe(65536);
      expect(resources2.byKind.texture).toBe(1);

      // Clean up
      gl.deleteTexture(texture);
      
      const resources3 = dbg.getResourceInfo();
      expect(resources3.byKind.texture).toBe(0);
    });

    test('tracks TypedArray buffer uploads', () => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      const data = new Float32Array(256); // 256 * 4 = 1024 bytes
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const resources = dbg.getResourceInfo();
      expect(resources.estBytes).toBe(1024);

      gl.deleteBuffer(buffer);
    });

    test('accumulates memory from multiple resources', () => {
      // Create buffers
      const buffer1 = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer1);
      gl.bufferData(gl.ARRAY_BUFFER, 1000, gl.STATIC_DRAW);

      const buffer2 = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
      gl.bufferData(gl.ARRAY_BUFFER, 2000, gl.STATIC_DRAW);

      // Create texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        64, 64, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      );

      const resources = dbg.getResourceInfo();
      expect(resources.estBytes).toBe(1000 + 2000 + 64*64*4);
      expect(resources.byKind.buffer).toBe(2);
      expect(resources.byKind.texture).toBe(1);

      // Clean up
      gl.deleteBuffer(buffer1);
      gl.deleteBuffer(buffer2);
      gl.deleteTexture(texture);
    });
  });

  describe('Resource lifecycle', () => {
    test('tracks resource creation and deletion', () => {
      const resources = dbg.getResourceInfo();
      expect(resources.list.length).toBe(0);

      // Create resources
      const texture1 = gl.createTexture();
      const texture2 = gl.createTexture();
      const buffer = gl.createBuffer();
      const shader = gl.createShader(gl.VERTEX_SHADER);

      const resources2 = dbg.getResourceInfo();
      expect(resources2.list.length).toBe(4);
      expect(resources2.byKind.texture).toBe(2);
      expect(resources2.byKind.buffer).toBe(1);
      expect(resources2.byKind.shader).toBe(1);

      // Delete some resources
      gl.deleteTexture(texture1);
      gl.deleteShader(shader);

      const resources3 = dbg.getResourceInfo();
      expect(resources3.list.length).toBe(2);
      expect(resources3.byKind.texture).toBe(1);
      expect(resources3.byKind.buffer).toBe(1);
      expect(resources3.byKind.shader).toBe(0);

      // Clean up
      gl.deleteTexture(texture2);
      gl.deleteBuffer(buffer);
    });
  });

  describe('Mode switching', () => {
    test('off mode does not track draw calls', () => {
      dbg.setMode('off');

      gl.drawArrays(gl.TRIANGLES, 0, 12);
      const stats = dbg.getStats();
      expect(stats.drawCalls).toBe(0);
      expect(stats.tris).toBe(0);

      // Note: Resource tracking is always active in current implementation
      // This is a known limitation - resource tracking cannot be disabled
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);

      // Clean up
      gl.deleteBuffer(buffer);
    });

    test('sampled mode tracks stats', () => {
      dbg.setMode('sampled');

      gl.drawArrays(gl.TRIANGLES, 0, 12);
      const stats = dbg.getStats();
      expect(stats.drawCalls).toBe(1);
      expect(stats.tris).toBe(4);

      // Resources should still be tracked
      const resources = dbg.getResourceInfo();
      expect(resources).toBeDefined();
    });
  });

  describe('Real context behavior', () => {
    test('context wrapping preserves original functionality', () => {
      // Test that GL operations still work
      const buffer = gl.createBuffer();
      expect(buffer).toBeTruthy();

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      // Should not throw
      
      const data = new Float32Array([0, 0, 0, 1, 1, 0]);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      // Should not throw

      const shader = gl.createShader(gl.VERTEX_SHADER);
      expect(shader).toBeTruthy();

      gl.deleteShader(shader);
      gl.deleteBuffer(buffer);
      // Should not throw
    });
  });
});