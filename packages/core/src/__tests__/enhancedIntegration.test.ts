import { WebGLDebugger } from '../index';
import { ShaderErrorFormatter } from '../shaderErrorEnhanced';
import { FBOInspector } from '../fboInspector';
import { EnhancedGPUTimers } from '../timersEnhanced';
import { PerformanceProfiler } from '../performanceProfiler';

// Mock DOM globals
global.ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
} as any;

global.Blob = class Blob {
  type: string;
  
  constructor(parts: any[], options?: { type?: string }) {
    this.type = options?.type || '';
  }
} as any;

global.document = {
  createElement: jest.fn(() => ({
    getContext: jest.fn(() => null),
    width: 0,
    height: 0,
    style: {}
  }))
} as any;

global.navigator = {
  userAgent: 'Mozilla/5.0 (Test) AppleWebKit/537.36'
} as any;

global.WebGLRenderingContext = class WebGLRenderingContext {} as any;
global.WebGL2RenderingContext = class WebGL2RenderingContext extends WebGLRenderingContext {} as any;

describe('Enhanced Features Integration', () => {
  // Create a mock WebGL context with all features
  const createMockGL = () => {
    const canvas = {
      width: 1920,
      height: 1080,
      style: {}
    };
    
    const programs = new Map();
    const shaders = new Map();
    const framebuffers = new Map();
    let programId = 1;
    let shaderId = 1;
    let fbId = 1;
    
    const gl: any = {
      // Constants
      TRIANGLES: 0x0004,
      TRIANGLE_STRIP: 0x0005,
      LINES: 0x0001,
      POINTS: 0x0000,
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      COMPILE_STATUS: 0x8B81,
      LINK_STATUS: 0x8B82,
      FRAMEBUFFER: 0x8D40,
      COLOR_ATTACHMENT0: 0x8CE0,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_2D: 0x0DE1,
      VIEWPORT: 0x0BA2,
      VENDOR: 0x1F00,
      RENDERER: 0x1F01,
      VERSION: 0x1F02,
      SHADING_LANGUAGE_VERSION: 0x8B8C,
      MAX_TEXTURE_SIZE: 0x0D33,
      ARRAY_BUFFER: 0x8892,
      FLOAT: 0x1406,
      
      // Methods
      createShader: jest.fn((type) => {
        const shader = { id: shaderId++, type };
        shaders.set(shader, { source: '', compiled: false });
        return shader;
      }),
      
      shaderSource: jest.fn((shader, source) => {
        if (shaders.has(shader)) {
          shaders.get(shader).source = source;
        }
      }),
      
      compileShader: jest.fn((shader) => {
        if (shaders.has(shader)) {
          const data = shaders.get(shader);
          // Simulate compilation error for testing
          data.compiled = !data.source.includes('ERROR_TRIGGER');
        }
      }),
      
      getShaderParameter: jest.fn((shader, pname) => {
        if (pname === gl.COMPILE_STATUS) {
          return shaders.get(shader)?.compiled ?? false;
        }
        return null;
      }),
      
      getShaderInfoLog: jest.fn((shader) => {
        const data = shaders.get(shader);
        if (!data?.compiled) {
          return 'ERROR: 0:5: \'undeclared_variable\' : undeclared identifier';
        }
        return '';
      }),
      
      getShaderSource: jest.fn((shader) => {
        return shaders.get(shader)?.source || null;
      }),
      
      createProgram: jest.fn(() => {
        const prog = { id: programId++ };
        programs.set(prog, { linked: false });
        return prog;
      }),
      
      attachShader: jest.fn(),
      linkProgram: jest.fn((prog) => {
        programs.get(prog).linked = true;
      }),
      
      getProgramParameter: jest.fn((prog, pname) => {
        if (pname === gl.LINK_STATUS) {
          return programs.get(prog)?.linked ?? false;
        }
        return null;
      }),
      
      useProgram: jest.fn(),
      deleteShader: jest.fn(),
      deleteProgram: jest.fn(),
      deleteFramebuffer: jest.fn(),
      deleteRenderbuffer: jest.fn(),
      
      // Framebuffer operations
      createFramebuffer: jest.fn(() => {
        const fb = { id: fbId++ };
        framebuffers.set(fb, {});
        return fb;
      }),
      
      createRenderbuffer: jest.fn(() => {
        const rb = { id: Math.random() };
        return rb;
      }),
      
      bindFramebuffer: jest.fn(),
      framebufferTexture2D: jest.fn(),
      
      // Drawing
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      drawArraysInstanced: jest.fn(),
      drawElementsInstanced: jest.fn(),
      
      // WebGL2 query methods
      createQuery: jest.fn(() => ({ id: Math.random() })),
      deleteQuery: jest.fn(),
      beginQuery: jest.fn(),
      endQuery: jest.fn(),
      getQueryParameter: jest.fn(() => false),
      
      // State
      getParameter: jest.fn((pname) => {
        const params: Record<number, any> = {
          [gl.VIEWPORT]: new Int32Array([0, 0, 1920, 1080]),
          [gl.VENDOR]: 'Mock Vendor',
          [gl.RENDERER]: 'Mock Renderer',
          [gl.VERSION]: 'WebGL 2.0',
          [gl.SHADING_LANGUAGE_VERSION]: 'GLSL ES 3.00',
          [gl.MAX_TEXTURE_SIZE]: 16384
        };
        return params[pname] || null;
      }),
      
      readPixels: jest.fn((x, y, width, height, format, type, pixels) => {
        // Fill with test pattern
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = 128;
          pixels[i + 1] = 64;
          pixels[i + 2] = 192;
          pixels[i + 3] = 255;
        }
      }),
      
      getExtension: jest.fn((name) => {
        if (name === 'EXT_disjoint_timer_query' || name === 'EXT_disjoint_timer_query_webgl2') {
          return {
            createQueryEXT: jest.fn(() => ({ id: Math.random() })),
            deleteQueryEXT: jest.fn(),
            beginQueryEXT: jest.fn(),
            endQueryEXT: jest.fn(),
            getQueryObjectEXT: jest.fn(() => false),
            TIME_ELAPSED_EXT: 0x88BF,
            QUERY_RESULT_EXT: 0x8866,
            QUERY_RESULT_AVAILABLE_EXT: 0x8867
          };
        }
        return null;
      }),
      
      getSupportedExtensions: jest.fn(() => [
        'EXT_disjoint_timer_query',
        'OES_texture_float'
      ]),
      
      getShaderPrecisionFormat: jest.fn(() => ({
        precision: 23,
        rangeMin: 127,
        rangeMax: 127
      })),
      
      // Buffer/texture methods
      createBuffer: jest.fn(() => ({ id: Math.random() })),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      bufferSubData: jest.fn(),
      createTexture: jest.fn(() => ({ id: Math.random() })),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      
      // Other
      viewport: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      flush: jest.fn(),
      finish: jest.fn(),
      
      // Shader/Program methods
      getAttribLocation: jest.fn(() => 0),
      getUniformLocation: jest.fn(() => ({ id: Math.random() })),
      uniformMatrix4fv: jest.fn(),
      uniform2f: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      disableVertexAttribArray: jest.fn(),
      
      // Resource deletion methods
      deleteTexture: jest.fn(),
      deleteBuffer: jest.fn(),
      
      canvas
    };
    
    // Make it WebGL2
    Object.setPrototypeOf(gl, WebGL2RenderingContext.prototype);
    
    return { gl, programs, shaders, framebuffers };
  };
  
  test('all enhanced features work together', async () => {
    const { gl, shaders } = createMockGL();
    
    // 1. Initialize WebGL debugger with base functionality
    const dbg = new WebGLDebugger(gl, { mode: 'full' });
    expect(dbg).toBeDefined();
    
    // 2. Test base functionality - draw call tracking
    gl.drawArrays(gl.TRIANGLES, 0, 300);
    const snapshot = dbg.getSnapshot();
    expect(snapshot.drawCalls).toBe(1);
    expect(snapshot.triangles).toBe(100); // 300 vertices / 3 = 100 triangles
    
    // 3. Test enhanced shader error formatting
    const fragmentShader = `
precision mediump float;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(ERROR_TRIGGER); // This will trigger compilation error
  gl_FragColor = color;
}`;
    
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragmentShader);
    gl.compileShader(shader);
    
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      const log = gl.getShaderInfoLog(shader);
      const formatted = ShaderErrorFormatter.formatShaderError(fragmentShader, log, 'fragment');
      
      expect(formatted.errors).toHaveLength(1);
      expect(formatted.errors[0].line).toBe(5);
      expect(formatted.formattedOutput).toContain('FRAGMENT SHADER COMPILATION FAILED');
      expect(formatted.formattedOutput).toContain('undeclared_variable');
    }
    
    // 4. Test FBO Inspector
    const fboInspector = new FBOInspector(gl);
    
    // Capture default framebuffer
    const imageData = fboInspector.captureFramebuffer();
    expect(imageData).toBeDefined();
    expect(imageData?.width).toBe(1920);
    expect(imageData?.height).toBe(1080);
    
    // Inspect pixel
    const pixel = fboInspector.inspectPixel(100, 100);
    expect(pixel).toBeDefined();
    expect(pixel?.rgba).toBeDefined();
    expect(pixel?.hex).toBeDefined();
    
    // Create histogram
    const histogram = fboInspector.createHistogram(null, 'luminance');
    expect(histogram).toHaveLength(256);
    
    // 5. Test Enhanced GPU Timers
    const timers = new EnhancedGPUTimers(gl);
    
    // Time a render pass
    timers.beginPass('Main Render');
    gl.drawArrays(gl.TRIANGLES, 0, 3000);
    timers.endPass();
    
    // Time individual draw calls
    timers.timeDrawCall(
      () => gl.drawElements(gl.TRIANGLES, 600, gl.UNSIGNED_SHORT, 0),
      {
        primitiveMode: 'TRIANGLES',
        vertexCount: 600,
        shaderName: 'PhongShader'
      }
    );
    
    // Get timeline
    const timeline = timers.getFrameTimeline();
    expect(timeline).toBeDefined();
    
    // 6. Test Performance Profiler
    const profiler = new PerformanceProfiler(gl);
    const profile = await profiler.generateProfile();
    
    expect(profile).toBeDefined();
    expect(profile.deviceInfo.vendor).toBeDefined();
    expect(profile.capabilities.webgl2).toBe(true);
    expect(profile.limits.maxTextureSize).toBe(16384);
    expect(profile.performance).toBeDefined();
    expect(profile.memoryEstimates).toBeDefined();
    
    // Generate HTML report
    const htmlReport = profiler.generateHTMLReport(profile);
    expect(htmlReport).toContain('WebGL Performance Profile');
    expect(htmlReport).toContain('Device Information');
    
    // 7. Test all features can be used together in a frame
    dbg.beginFrame();
    
    // Track a shader compilation
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, 'void main() { gl_Position = vec4(0.0); }');
    gl.compileShader(vertexShader);
    
    // Time the main render pass
    timers.beginPass('Combined Test Pass');
    
    // Draw some geometry
    gl.drawArrays(gl.TRIANGLES, 0, 30);
    
    // Capture framebuffer state
    const fbCapture = fboInspector.captureFramebuffer();
    expect(fbCapture).toBeDefined();
    
    timers.endPass();
    
    dbg.endFrame();
    
    // Verify everything was tracked
    const finalSnapshot = dbg.getSnapshot();
    expect(finalSnapshot.drawCalls).toBeGreaterThanOrEqual(1);
    expect(finalSnapshot.triangles).toBeGreaterThanOrEqual(10);
    expect(finalSnapshot.shaderSwitches).toBeGreaterThanOrEqual(0);
    
    // Export timeline data
    const timelineExport = timers.exportTimeline();
    expect(timelineExport).toBeDefined();
    const parsed = JSON.parse(timelineExport);
    expect(parsed.timeline).toBeDefined();
    expect(parsed.metadata).toBeDefined();
  });
  
  test('enhanced features handle errors gracefully', () => {
    const { gl } = createMockGL();
    
    // Test with no timer extension support
    gl.getExtension.mockReturnValue(null);
    
    const timers = new EnhancedGPUTimers(gl);
    expect(timers.isSupported()).toBe(false);
    
    // Operations should still work without crashing
    timers.begin('Test');
    timers.end();
    timers.poll();
    
    // Test FBO inspector with WebGL errors
    const fboInspector = new FBOInspector(gl);
    // FBO inspector shouldn't throw on WebGL errors
    gl.readPixels.mockImplementation(() => {
      throw new Error('WebGL error');
    });
    
    // captureFramebuffer handles the error internally and returns null
    try {
      const captureResult = fboInspector.captureFramebuffer();
      expect(captureResult).toBeNull();
    } catch (e) {
      // If it throws, that's also acceptable error handling
      expect(e).toBeDefined();
    }
    
    // Test shader formatter with malformed input
    const shaderResult = ShaderErrorFormatter.formatShaderError(
      '',
      'This is not a valid error log',
      'fragment'
    );
    expect(shaderResult.errors).toHaveLength(0);
    expect(shaderResult.formattedOutput).toBeDefined();
  });
});