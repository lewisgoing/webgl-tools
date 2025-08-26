import { makeResourceTracker } from '../resources';
import type { GL } from '../caps';

// Mock WebGL context
const createMockGL = () => {
  const resources = {
    textures: new Map(),
    buffers: new Map(),
    framebuffers: new Map(),
    renderbuffers: new Map(),
    shaders: new Map(),
    programs: new Map(),
    vaos: new Map()
  };
  
  let idCounter = 1;
  
  const gl: any = {
    // Texture methods
    createTexture: jest.fn(() => {
      const texture = { id: idCounter++ };
      resources.textures.set(texture, {});
      return texture;
    }),
    deleteTexture: jest.fn((texture) => {
      if (texture) resources.textures.delete(texture);
    }),
    
    // Buffer methods
    createBuffer: jest.fn(() => {
      const buffer = { id: idCounter++ };
      resources.buffers.set(buffer, { size: 0 });
      return buffer;
    }),
    deleteBuffer: jest.fn((buffer) => {
      if (buffer) resources.buffers.delete(buffer);
    }),
    bufferData: jest.fn((target, sizeOrData, usage) => {
      // Mock implementation
    }),
    bufferSubData: jest.fn((target, offset, data) => {
      // Mock implementation
    }),
    
    // Framebuffer methods
    createFramebuffer: jest.fn(() => {
      const fb = { id: idCounter++ };
      resources.framebuffers.set(fb, {});
      return fb;
    }),
    deleteFramebuffer: jest.fn((fb) => {
      if (fb) resources.framebuffers.delete(fb);
    }),
    
    // Renderbuffer methods
    createRenderbuffer: jest.fn(() => {
      const rb = { id: idCounter++ };
      resources.renderbuffers.set(rb, {});
      return rb;
    }),
    deleteRenderbuffer: jest.fn((rb) => {
      if (rb) resources.renderbuffers.delete(rb);
    }),
    
    // Shader methods
    createShader: jest.fn((type) => {
      const shader = { id: idCounter++, type };
      resources.shaders.set(shader, { type });
      return shader;
    }),
    deleteShader: jest.fn((shader) => {
      if (shader) resources.shaders.delete(shader);
    }),
    
    // Program methods
    createProgram: jest.fn(() => {
      const program = { id: idCounter++ };
      resources.programs.set(program, {});
      return program;
    }),
    deleteProgram: jest.fn((program) => {
      if (program) resources.programs.delete(program);
    }),
    
    // Texture upload
    texImage2D: jest.fn((...args) => {
      // Mock implementation
    }),
    
    // GL constants
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    RGB: 0x1907,
    RGBA: 0x1908,
    LUMINANCE: 0x1909,
    ALPHA: 0x190A,
    LUMINANCE_ALPHA: 0x190B,
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    HALF_FLOAT: 0x8D61,
    
    // Extension methods - need to store extension object so it can be modified
    __vaoExt: null,
    getExtension: jest.fn((name) => {
      if (name === 'OES_vertex_array_object') {
        if (!gl.__vaoExt) {
          gl.__vaoExt = {
            createVertexArrayOES: jest.fn(() => {
              const vao = { id: idCounter++ };
              resources.vaos.set(vao, {});
              return vao;
            }),
            deleteVertexArrayOES: jest.fn((vao) => {
              if (vao) resources.vaos.delete(vao);
            })
          };
        }
        return gl.__vaoExt;
      }
      return null;
    })
  };
  
  return { gl, resources };
};

// Mock WebGL2 context
const createMockGL2 = () => {
  const base = createMockGL();
  const gl2: any = {
    ...base.gl,
    createVertexArray: jest.fn(() => {
      const vao = { id: Math.random() };
      base.resources.vaos.set(vao, {});
      return vao;
    }),
    deleteVertexArray: jest.fn((vao) => {
      if (vao) base.resources.vaos.delete(vao);
    })
  };
  
  // Set prototype for instanceof check
  Object.setPrototypeOf(gl2, WebGL2RenderingContext.prototype);
  
  return { gl: gl2, resources: base.resources };
};

// Mock WebGL classes
global.WebGLRenderingContext = class WebGLRenderingContext {} as any;
global.WebGL2RenderingContext = class WebGL2RenderingContext extends WebGLRenderingContext {} as any;

describe('Resource Tracker', () => {
  describe('initialization', () => {
    test('creates tracker with correct initial state', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      expect(tracker.list).toEqual([]);
      expect(tracker.byKind).toEqual({
        texture: 0,
        buffer: 0,
        shader: 0,
        program: 0,
        framebuffer: 0,
        renderbuffer: 0,
        vao: 0
      });
      expect(tracker.estBytes).toBe(0);
    });
    
    test('wraps GL methods correctly', () => {
      const { gl } = createMockGL();
      const originalCreateTexture = gl.createTexture;
      
      makeResourceTracker(gl, {});
      
      // Methods should be wrapped
      expect(gl.createTexture).not.toBe(originalCreateTexture);
      expect(gl.createTexture).toBeInstanceOf(Function);
    });
  });
  
  describe('texture tracking', () => {
    test('tracks texture creation', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const texture = gl.createTexture();
      
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('texture');
      expect(tracker.list[0].id).toMatch(/^tex_\d+$/);
      expect(tracker.byKind.texture).toBe(1);
    });
    
    test('tracks texture deletion', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const texture = gl.createTexture();
      expect(tracker.byKind.texture).toBe(1);
      
      gl.deleteTexture(texture);
      
      expect(tracker.list).toHaveLength(0);
      expect(tracker.byKind.texture).toBe(0);
    });
    
    test('tracks texture upload memory', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // texImage2D with full specification
      gl.texImage2D(
        gl.TEXTURE_2D, 
        0, 
        gl.RGBA, 
        512, 
        512, 
        0, 
        gl.RGBA, 
        gl.UNSIGNED_BYTE, 
        null
      );
      
      // 512 * 512 * 4 bytes (RGBA)
      expect(tracker.estBytes).toBe(512 * 512 * 4);
    });
    
    test('handles different texture formats correctly', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // RGB texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 100, 100, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      expect(tracker.estBytes).toBe(100 * 100 * 3);
      
      // LUMINANCE texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 100, 100, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
      expect(tracker.estBytes).toBe(100 * 100 * 3 + 100 * 100 * 1);
      
      // FLOAT texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 50, 50, 0, gl.RGBA, gl.FLOAT, null);
      expect(tracker.estBytes).toBe(100 * 100 * 3 + 100 * 100 * 1 + 50 * 50 * 4 * 4);
    });
  });
  
  describe('buffer tracking', () => {
    test('tracks buffer creation', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const buffer = gl.createBuffer();
      
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('buffer');
      expect(tracker.list[0].id).toMatch(/^buf_\d+$/);
      expect(tracker.byKind.buffer).toBe(1);
    });
    
    test('tracks buffer deletion', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const buffer = gl.createBuffer();
      gl.deleteBuffer(buffer);
      
      expect(tracker.list).toHaveLength(0);
      expect(tracker.byKind.buffer).toBe(0);
    });
    
    test('tracks buffer data uploads', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // Size-based upload
      gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(1024);
      
      // ArrayBuffer upload
      const arrayBuffer = new ArrayBuffer(2048);
      gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(1024 + 2048);
      
      // TypedArray upload
      const floatArray = new Float32Array(256);
      gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(1024 + 2048 + 1024);
    });
    
    test('bufferSubData does not increase estimated bytes', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const initialBytes = tracker.estBytes;
      const data = new Float32Array(100);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      
      expect(tracker.estBytes).toBe(initialBytes);
    });
    
    test('tracks manual buffer uploads via onBufferUpload', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      tracker.onBufferUpload(5000);
      expect(tracker.estBytes).toBe(5000);
      
      tracker.onBufferUpload(3000);
      expect(tracker.estBytes).toBe(8000);
    });
  });
  
  describe('shader and program tracking', () => {
    test('tracks shader creation with type', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('shader');
      expect(tracker.list[0].id).toMatch(/^sha_\d+$/);
      expect(tracker.list[0].meta.type).toBe(gl.VERTEX_SHADER);
      expect(tracker.byKind.shader).toBe(1);
    });
    
    test('tracks program creation', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const program = gl.createProgram();
      
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('program');
      expect(tracker.list[0].id).toMatch(/^pro_\d+$/);
      expect(tracker.byKind.program).toBe(1);
    });
    
    test('tracks shader and program deletion', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const shader = gl.createShader(gl.FRAGMENT_SHADER);
      const program = gl.createProgram();
      
      expect(tracker.list).toHaveLength(2);
      
      gl.deleteShader(shader);
      expect(tracker.byKind.shader).toBe(0);
      
      gl.deleteProgram(program);
      expect(tracker.byKind.program).toBe(0);
      expect(tracker.list).toHaveLength(0);
    });
  });
  
  describe('framebuffer and renderbuffer tracking', () => {
    test('tracks framebuffer lifecycle', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const fb = gl.createFramebuffer();
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('framebuffer');
      expect(tracker.byKind.framebuffer).toBe(1);
      
      gl.deleteFramebuffer(fb);
      expect(tracker.list).toHaveLength(0);
      expect(tracker.byKind.framebuffer).toBe(0);
    });
    
    test('tracks renderbuffer lifecycle', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const rb = gl.createRenderbuffer();
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('renderbuffer');
      expect(tracker.byKind.renderbuffer).toBe(1);
      
      gl.deleteRenderbuffer(rb);
      expect(tracker.list).toHaveLength(0);
      expect(tracker.byKind.renderbuffer).toBe(0);
    });
  });
  
  describe('VAO tracking', () => {
    test('tracks VAO with WebGL1 extension', () => {
      const { gl } = createMockGL();
      
      // Create tracker which will get and wrap the extension
      const tracker = makeResourceTracker(gl, {});
      
      // Get the wrapped extension  
      const vaoExt = gl.getExtension('OES_vertex_array_object');
      
      if (vaoExt) {
        // Use the wrapped method names that resource tracker sets up
        const createMethod = vaoExt.createVertexArray || vaoExt.createVertexArrayOES;
        const deleteMethod = vaoExt.deleteVertexArray || vaoExt.deleteVertexArrayOES;
        
        const vao = createMethod();
        expect(tracker.list).toHaveLength(1);
        expect(tracker.list[0].type).toBe('vao');
        expect(tracker.byKind.vao).toBe(1);
        
        deleteMethod(vao);
        expect(tracker.list).toHaveLength(0);
        expect(tracker.byKind.vao).toBe(0);
      }
    });
    
    test('tracks VAO with WebGL2', () => {
      const { gl } = createMockGL2();
      const tracker = makeResourceTracker(gl, {});
      
      const vao = gl.createVertexArray();
      expect(tracker.list).toHaveLength(1);
      expect(tracker.list[0].type).toBe('vao');
      expect(tracker.byKind.vao).toBe(1);
      
      gl.deleteVertexArray(vao);
      expect(tracker.list).toHaveLength(0);
      expect(tracker.byKind.vao).toBe(0);
    });
  });
  
  describe('resource metadata', () => {
    test('tracks creation timestamps', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const before = performance.now();
      const texture = gl.createTexture();
      const after = performance.now();
      
      expect(tracker.list[0].createdAt).toBeGreaterThanOrEqual(before);
      expect(tracker.list[0].createdAt).toBeLessThanOrEqual(after);
      // lastUsed should be the same value as createdAt (both use performance.now())
      // Use less precision due to potential timing differences
      expect(tracker.list[0].lastUsed).toBeCloseTo(tracker.list[0].createdAt, 2);
    });
    
    test('logs creates when option enabled', () => {
      const { gl } = createMockGL();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const tracker = makeResourceTracker(gl, { logCreates: true });
      
      const texture = gl.createTexture();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ResourceCreated]',
        'texture',
        expect.stringMatching(/^tex_\d+$/),
        expect.objectContaining({ stack: expect.any(String) })
      );
      
      const buffer = gl.createBuffer();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ResourceCreated]',
        'buffer',
        expect.stringMatching(/^buf_\d+$/),
        expect.objectContaining({ stack: expect.any(String) })
      );
      
      // Buffer data logging
      gl.bufferData(gl.ARRAY_BUFFER, 1024, gl.STATIC_DRAW);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[BufferData]',
        1024,
        'bytes, total:',
        1024
      );
      
      consoleSpy.mockRestore();
    });
    
    test('captures creation stack traces', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const texture = gl.createTexture();
      const resource = tracker.list[0];
      
      expect(resource.meta).toBeDefined();
      expect(resource.meta.stack).toBeDefined();
      // Stack trace should be a string with multiple lines
      expect(typeof resource.meta.stack).toBe('string');
      expect(resource.meta.stack.split('\n').length).toBeGreaterThan(0);
    });
  });
  
  describe('null handling', () => {
    test('handles null resource deletion gracefully', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // Should not throw
      gl.deleteTexture(null);
      gl.deleteBuffer(null);
      gl.deleteShader(null);
      gl.deleteProgram(null);
      gl.deleteFramebuffer(null);
      gl.deleteRenderbuffer(null);
      
      expect(tracker.list).toHaveLength(0);
      expect(tracker.estBytes).toBe(0);
    });
    
    test('handles creation failures', () => {
      const { gl } = createMockGL();
      
      // Mock creation failures
      gl.createTexture.mockReturnValueOnce(null);
      gl.createBuffer.mockReturnValueOnce(null);
      
      const tracker = makeResourceTracker(gl, {});
      
      const texture = gl.createTexture();
      const buffer = gl.createBuffer();
      
      expect(texture).toBeNull();
      expect(buffer).toBeNull();
      expect(tracker.list).toHaveLength(0);
    });
  });
  
  describe('complex scenarios', () => {
    test('tracks multiple resources of different types', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // Create various resources
      const texture1 = gl.createTexture();
      const texture2 = gl.createTexture();
      const buffer = gl.createBuffer();
      const shader = gl.createShader(gl.VERTEX_SHADER);
      const program = gl.createProgram();
      const fb = gl.createFramebuffer();
      
      expect(tracker.list).toHaveLength(6);
      expect(tracker.byKind).toEqual({
        texture: 2,
        buffer: 1,
        shader: 1,
        program: 1,
        framebuffer: 1,
        renderbuffer: 0,
        vao: 0
      });
      
      // Delete some resources
      gl.deleteTexture(texture1);
      gl.deleteBuffer(buffer);
      
      expect(tracker.list).toHaveLength(4);
      expect(tracker.byKind.texture).toBe(1);
      expect(tracker.byKind.buffer).toBe(0);
    });
    
    test('tracks memory across multiple operations', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      // Upload various data
      gl.bufferData(gl.ARRAY_BUFFER, 1000, gl.STATIC_DRAW);
      expect(tracker.estBytes).toBe(1000);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      expect(tracker.estBytes).toBe(1000 + 64 * 64 * 4);
      
      tracker.onBufferUpload(5000);
      expect(tracker.estBytes).toBe(1000 + 64 * 64 * 4 + 5000);
      
      // Upload more textures
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 128, 128, 0, gl.RGB, gl.FLOAT, null);
      expect(tracker.estBytes).toBe(1000 + 64 * 64 * 4 + 5000 + 128 * 128 * 3 * 4);
    });
    
    test('resource IDs are unique and sequential', () => {
      const { gl } = createMockGL();
      const tracker = makeResourceTracker(gl, {});
      
      const resources = [];
      for (let i = 0; i < 5; i++) {
        resources.push(gl.createTexture());
      }
      
      const ids = tracker.list.map(r => r.id);
      expect(ids).toEqual(['tex_1', 'tex_2', 'tex_3', 'tex_4', 'tex_5']);
      
      // Different resource types have their own prefixes
      const buffer = gl.createBuffer();
      expect(tracker.list.find(r => r.type === 'buffer')?.id).toBe('buf_6');
    });
  });
});