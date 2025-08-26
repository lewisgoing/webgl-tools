import { makeResourceTracker } from '../resources';

// Mock GL context
const createMockGL = () => ({
  createTexture: jest.fn(() => ({})),
  deleteTexture: jest.fn(),
  createBuffer: jest.fn(() => ({})),
  deleteBuffer: jest.fn(),
  createShader: jest.fn(() => ({})),
  deleteShader: jest.fn(),
  createProgram: jest.fn(() => ({})),
  deleteProgram: jest.fn(),
  createFramebuffer: jest.fn(() => ({})),
  deleteFramebuffer: jest.fn(),
  createRenderbuffer: jest.fn(() => ({})),
  deleteRenderbuffer: jest.fn(),
  
  bufferData: jest.fn(),
  bufferSubData: jest.fn(),
  texImage2D: jest.fn(),
  
  getExtension: jest.fn(),
  
  // GL constants
  UNSIGNED_BYTE: 0x1401,
  UNSIGNED_SHORT: 0x1403,
  UNSIGNED_INT: 0x1405,
  FLOAT: 0x1406,
  HALF_FLOAT: 0x8D61,
  
  RGB: 0x1907,
  RGBA: 0x1908,
  LUMINANCE: 0x1909,
  ALPHA: 0x190A,
  LUMINANCE_ALPHA: 0x190B,
});

describe('Memory Tracking', () => {
  let gl: any;
  let tracker: ReturnType<typeof makeResourceTracker>;

  beforeEach(() => {
    gl = createMockGL();
  });

  describe('Buffer memory tracking', () => {
    test('tracks bufferData with size parameter', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // Initially should be 0
      expect(tracker.estBytes).toBe(0);
      
      // Call bufferData with size
      gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);
      
      // Should track the size
      expect(tracker.estBytes).toBe(1024);
    });

    test('tracks bufferData with ArrayBuffer', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      const buffer = new ArrayBuffer(2048);
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
      
      expect(tracker.estBytes).toBe(2048);
    });

    test('tracks bufferData with TypedArray', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      const floatArray = new Float32Array(256); // 256 * 4 = 1024 bytes
      gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
      
      expect(tracker.estBytes).toBe(1024);
    });

    test('accumulates multiple buffer uploads', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      gl.bufferData(gl.ARRAY_BUFFER, 1000, gl.STATIC_DRAW);
      gl.bufferData(gl.ARRAY_BUFFER, 2000, gl.STATIC_DRAW);
      gl.bufferData(gl.ARRAY_BUFFER, 3000, gl.STATIC_DRAW);
      
      expect(tracker.estBytes).toBe(6000);
    });

    test('bufferSubData does not add to total', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      gl.bufferData(gl.ARRAY_BUFFER, 1000, gl.STATIC_DRAW);
      const initialBytes = tracker.estBytes;
      
      // SubData updates existing buffer, shouldn't add
      const data = new Uint8Array(100);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      
      expect(tracker.estBytes).toBe(initialBytes);
    });
  });

  describe('Texture memory tracking', () => {
    test('tracks texImage2D with RGBA/UNSIGNED_BYTE', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 512x512 RGBA texture = 512 * 512 * 4 = 1,048,576 bytes
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        512, 512, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      );
      
      expect(tracker.estBytes).toBe(512 * 512 * 4);
    });

    test('tracks texImage2D with RGB/UNSIGNED_BYTE', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 256x256 RGB texture = 256 * 256 * 3 = 196,608 bytes
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB,
        256, 256, 0,
        gl.RGB, gl.UNSIGNED_BYTE, null
      );
      
      expect(tracker.estBytes).toBe(256 * 256 * 3);
    });

    test('tracks texImage2D with LUMINANCE', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 128x128 LUMINANCE texture = 128 * 128 * 1 = 16,384 bytes
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE,
        128, 128, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, null
      );
      
      expect(tracker.estBytes).toBe(128 * 128 * 1);
    });

    test('tracks texImage2D with FLOAT type', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 64x64 RGBA FLOAT texture = 64 * 64 * 4 * 4 = 65,536 bytes
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        64, 64, 0,
        gl.RGBA, gl.FLOAT, null
      );
      
      expect(tracker.estBytes).toBe(64 * 64 * 4 * 4);
    });

    test('tracks texImage2D with HALF_FLOAT type', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 32x32 RGBA HALF_FLOAT texture = 32 * 32 * 4 * 2 = 8,192 bytes
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        32, 32, 0,
        gl.RGBA, gl.HALF_FLOAT, null
      );
      
      expect(tracker.estBytes).toBe(32 * 32 * 4 * 2);
    });
  });

  describe('Resource getter functionality', () => {
    test('estBytes is a getter that returns current value', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      expect(tracker.estBytes).toBe(0);
      
      gl.bufferData(gl.ARRAY_BUFFER, 1000, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(1000);
      
      gl.bufferData(gl.ARRAY_BUFFER, 2000, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(3000);
    });

    test('onBufferUpload method adds to total', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      tracker.onBufferUpload(5000);
      expect(tracker.estBytes).toBe(5000);
      
      tracker.onBufferUpload(3000);
      expect(tracker.estBytes).toBe(8000);
    });
  });

  describe('Real world memory scenarios', () => {
    test('Box geometry memory usage', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // Position: 24 vertices * 3 components * 4 bytes = 288 bytes
      const positions = new Float32Array(24 * 3);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      
      // Normal: 24 vertices * 3 components * 4 bytes = 288 bytes
      const normals = new Float32Array(24 * 3);
      gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
      
      // UV: 24 vertices * 2 components * 4 bytes = 192 bytes
      const uvs = new Float32Array(24 * 2);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      
      // Index: 36 indices * 2 bytes = 72 bytes
      const indices = new Uint16Array(36);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      
      expect(tracker.estBytes).toBe(288 + 288 + 192 + 72); // 840 bytes
    });

    test('Large texture atlas memory', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // 2048x2048 RGBA texture = 16 MB
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        2048, 2048, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      );
      
      expect(tracker.estBytes).toBe(2048 * 2048 * 4); // 16,777,216 bytes
    });

    test('Multiple resources accumulation', () => {
      tracker = makeResourceTracker(gl as any, { logCreates: false });
      
      // Create 100 small textures
      for (let i = 0; i < 100; i++) {
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA,
          64, 64, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, null
        );
      }
      
      // Create 50 vertex buffers
      for (let i = 0; i < 50; i++) {
        gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);
      }
      
      const expectedTextureMemory = 100 * 64 * 64 * 4; // 1,638,400 bytes
      const expectedBufferMemory = 50 * 1024; // 51,200 bytes
      
      expect(tracker.estBytes).toBe(expectedTextureMemory + expectedBufferMemory);
    });
  });
});