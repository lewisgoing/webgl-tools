// Mock WebGL context for testing
const mockWebGLRenderingContext = () => {
  const gl = {
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,
    
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    
    RGB: 0x1907,
    RGBA: 0x1908,
    LUMINANCE: 0x1909,
    LUMINANCE_ALPHA: 0x190A,
    
    // Mock methods
    getExtension: jest.fn(),
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
    
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
    
    bindTexture: jest.fn(),
    useProgram: jest.fn(),
    
    bufferData: jest.fn(),
    bufferSubData: jest.fn(),
    texImage2D: jest.fn(),
    
    getParameter: jest.fn(),
    getError: jest.fn(() => 0),
  };
  
  return gl;
};

// Make WebGL contexts available globally
global.WebGLRenderingContext = class WebGLRenderingContext {};
global.WebGL2RenderingContext = class WebGL2RenderingContext {};

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
  };
}

// Suppress console warnings in tests for expected warnings
global.beforeEach = global.beforeEach || (() => {});
global.afterEach = global.afterEach || (() => {});

// Store original console methods
const originalConsole = {
  warn: console.warn,
  error: console.error,
};

// Mock console to suppress expected warnings
console.warn = jest.fn((...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('GPU timer queries not supported') ||
    message.includes('Performance benchmark failed')
  ) {
    return; // Suppress these warnings
  }
  // Call original warn for other warnings
  originalConsole.warn.apply(console, args);
});