import { detectCapabilities, type Capabilities } from './caps';
import type { GL } from './caps';

export interface PerformanceProfile {
  timestamp: number;
  userAgent: string;
  deviceInfo: {
    vendor: string;
    renderer: string;
    glVersion: string;
    shadingLanguageVersion: string;
  };
  capabilities: Capabilities;
  limits: {
    maxTextureSize: number;
    maxCubeMapTextureSize: number;
    maxRenderBufferSize: number;
    maxViewportDims: number[];
    maxTextureImageUnits: number;
    maxCombinedTextureImageUnits: number;
    maxVertexTextureImageUnits: number;
    maxVertexAttribs: number;
    maxVertexUniformVectors: number;
    maxFragmentUniformVectors: number;
    maxVaryingVectors: number;
    aliasedPointSizeRange: number[];
    aliasedLineWidthRange: number[];
    maxDrawBuffers?: number;
    maxColorAttachments?: number;
    maxSamples?: number;
    max3DTextureSize?: number;
    maxArrayTextureLayers?: number;
    maxUniformBufferBindings?: number;
  };
  extensions: string[];
  performance: {
    triangleRate: number;
    fillRate: number;
    textureUploadRate: number;
    shaderCompilationTime: number;
    bufferUploadRate: number;
  };
  memoryEstimates: {
    textureMemory: number;
    bufferMemory: number;
    totalAvailable?: number;
  };
}

export class PerformanceProfiler {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private isWebGL2: boolean;
  
  constructor(private glContext: GL) {
    this.gl = glContext as WebGLRenderingContext | WebGL2RenderingContext;
    this.isWebGL2 = glContext instanceof WebGL2RenderingContext;
  }
  
  /**
   * Generate a complete performance profile
   */
  async generateProfile(): Promise<PerformanceProfile> {
    const capabilities = detectCapabilities(this.glContext);
    
    const profile: PerformanceProfile = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      capabilities,
      limits: this.getLimits(),
      extensions: this.getExtensions(),
      performance: await this.runPerformanceBenchmarks(),
      memoryEstimates: this.estimateMemoryLimits()
    };
    
    return profile;
  }
  
  /**
   * Get basic device information
   */
  private getDeviceInfo() {
    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      vendor: debugInfo 
        ? this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : this.gl.getParameter(this.gl.VENDOR),
      renderer: debugInfo
        ? this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : this.gl.getParameter(this.gl.RENDERER),
      glVersion: this.gl.getParameter(this.gl.VERSION),
      shadingLanguageVersion: this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION)
    };
  }
  
  /**
   * Get WebGL limits
   */
  private getLimits() {
    const gl = this.gl;
    const gl2 = this.isWebGL2 ? (gl as WebGL2RenderingContext) : null;
    
    const limits: PerformanceProfile['limits'] = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
      aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)
    };
    
    if (gl2) {
      limits.maxDrawBuffers = gl2.getParameter(gl2.MAX_DRAW_BUFFERS);
      limits.maxColorAttachments = gl2.getParameter(gl2.MAX_COLOR_ATTACHMENTS);
      limits.maxSamples = gl2.getParameter(gl2.MAX_SAMPLES);
      limits.max3DTextureSize = gl2.getParameter(gl2.MAX_3D_TEXTURE_SIZE);
      limits.maxArrayTextureLayers = gl2.getParameter(gl2.MAX_ARRAY_TEXTURE_LAYERS);
      limits.maxUniformBufferBindings = gl2.getParameter(gl2.MAX_UNIFORM_BUFFER_BINDINGS);
    }
    
    return limits;
  }
  
  /**
   * Get all available extensions
   */
  private getExtensions(): string[] {
    const extensions = this.gl.getSupportedExtensions() || [];
    return extensions.sort();
  }
  
  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<PerformanceProfile['performance']> {
    const results = {
      triangleRate: 0,
      fillRate: 0,
      textureUploadRate: 0,
      shaderCompilationTime: 0,
      bufferUploadRate: 0
    };
    
    // Save current state
    const currentProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);
    const currentArrayBuffer = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
    const currentViewport = this.gl.getParameter(this.gl.VIEWPORT);
    
    try {
      // Triangle rate test
      results.triangleRate = await this.benchmarkTriangleRate();
      
      // Fill rate test
      results.fillRate = await this.benchmarkFillRate();
      
      // Texture upload test
      results.textureUploadRate = await this.benchmarkTextureUpload();
      
      // Shader compilation test
      results.shaderCompilationTime = await this.benchmarkShaderCompilation();
      
      // Buffer upload test
      results.bufferUploadRate = await this.benchmarkBufferUpload();
      
    } catch (e) {
      console.warn('Performance benchmark failed:', e);
    } finally {
      // Restore state
      this.gl.useProgram(currentProgram);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, currentArrayBuffer);
      this.gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);
    }
    
    return results;
  }
  
  /**
   * Benchmark triangle rendering rate
   */
  private async benchmarkTriangleRate(): Promise<number> {
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       0,  1, 0
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    // Simple shader
    const vs = `
      attribute vec3 position;
      void main() { gl_Position = vec4(position, 1.0); }
    `;
    const fs = `
      precision mediump float;
      void main() { gl_FragColor = vec4(1.0); }
    `;
    
    const program = this.createProgram(vs, fs);
    if (!program) return 0;
    
    this.gl.useProgram(program);
    const posLoc = this.gl.getAttribLocation(program, 'position');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
    
    // Benchmark
    const triangleCount = 10000;
    const start = performance.now();
    
    for (let i = 0; i < triangleCount; i++) {
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }
    
    this.gl.finish();
    const elapsed = performance.now() - start;
    
    // Cleanup
    this.gl.deleteBuffer(buffer);
    this.gl.deleteProgram(program);
    
    return (triangleCount * 3) / (elapsed / 1000); // vertices per second
  }
  
  /**
   * Benchmark fill rate
   */
  private async benchmarkFillRate(): Promise<number> {
    const size = 512;
    const iterations = 100;
    
    // Create fullscreen quad
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
      -1,  1, 0,
       1,  1, 0
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    // Overdraw shader
    const vs = `
      attribute vec3 position;
      void main() { gl_Position = vec4(position, 1.0); }
    `;
    const fs = `
      precision mediump float;
      uniform float time;
      void main() { 
        gl_FragColor = vec4(sin(time), cos(time), 0.5, 1.0);
      }
    `;
    
    const program = this.createProgram(vs, fs);
    if (!program) return 0;
    
    this.gl.useProgram(program);
    const posLoc = this.gl.getAttribLocation(program, 'position');
    const timeLoc = this.gl.getUniformLocation(program, 'time');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
    
    // Create FBO
    const fbo = this.gl.createFramebuffer();
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    
    this.gl.viewport(0, 0, size, size);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      this.gl.uniform1f(timeLoc, i * 0.1);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    
    this.gl.finish();
    const elapsed = performance.now() - start;
    
    // Cleanup
    this.gl.deleteFramebuffer(fbo);
    this.gl.deleteTexture(texture);
    this.gl.deleteBuffer(buffer);
    this.gl.deleteProgram(program);
    
    const pixelsPerFrame = size * size;
    const totalPixels = pixelsPerFrame * iterations;
    return totalPixels / (elapsed / 1000); // pixels per second
  }
  
  /**
   * Benchmark texture upload speed
   */
  private async benchmarkTextureUpload(): Promise<number> {
    const sizes = [64, 128, 256, 512, 1024];
    let totalBytes = 0;
    let totalTime = 0;
    
    for (const size of sizes) {
      if (size > this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)) continue;
      
      const data = new Uint8Array(size * size * 4);
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      
      // Warm up
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
      
      // Benchmark
      const iterations = 10;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
      }
      
      this.gl.finish();
      const elapsed = performance.now() - start;
      
      totalBytes += size * size * 4 * iterations;
      totalTime += elapsed;
      
      this.gl.deleteTexture(texture);
    }
    
    return totalBytes / (totalTime / 1000); // bytes per second
  }
  
  /**
   * Benchmark shader compilation
   */
  private async benchmarkShaderCompilation(): Promise<number> {
    // Complex shader to compile
    const vs = `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      uniform mat4 modelMatrix;
      uniform mat4 viewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat3 normalMatrix;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vNormal = normalMatrix * normal;
        vUv = uv;
        vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
        vPosition = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fs = `
      precision mediump float;
      uniform vec3 lightDirection;
      uniform vec3 lightColor;
      uniform vec3 ambientColor;
      uniform sampler2D diffuseMap;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        float NdotL = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = lightColor * NdotL;
        vec4 texColor = texture2D(diffuseMap, vUv);
        vec3 ambient = ambientColor * texColor.rgb;
        gl_FragColor = vec4(ambient + diffuse * texColor.rgb, texColor.a);
      }
    `;
    
    const start = performance.now();
    const program = this.createProgram(vs, fs);
    const elapsed = performance.now() - start;
    
    if (program) {
      this.gl.deleteProgram(program);
    }
    
    return elapsed;
  }
  
  /**
   * Benchmark buffer upload rate
   */
  private async benchmarkBufferUpload(): Promise<number> {
    const sizes = [1024, 1024 * 16, 1024 * 64, 1024 * 256]; // Various buffer sizes
    let totalBytes = 0;
    let totalTime = 0;
    
    for (const size of sizes) {
      const data = new Float32Array(size / 4);
      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      
      const iterations = 50;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
      }
      
      this.gl.finish();
      const elapsed = performance.now() - start;
      
      totalBytes += size * iterations;
      totalTime += elapsed;
      
      this.gl.deleteBuffer(buffer);
    }
    
    return totalBytes / (totalTime / 1000); // bytes per second
  }
  
  /**
   * Estimate memory limits
   */
  private estimateMemoryLimits() {
    const limits = {
      textureMemory: 0,
      bufferMemory: 0,
      totalAvailable: undefined as number | undefined
    };
    
    // Estimate texture memory based on max texture size
    const maxSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    const bytesPerPixel = 4; // RGBA
    const mipmaps = Math.log2(maxSize) + 1;
    
    // Rough estimate: can probably allocate at least 4 max-sized textures
    limits.textureMemory = 4 * (maxSize * maxSize * bytesPerPixel * 1.33); // 1.33 for mipmaps
    
    // Buffer memory is harder to estimate, use a conservative value
    limits.bufferMemory = 256 * 1024 * 1024; // 256MB
    
    // Try to get actual memory info if available
    const memoryInfo = (this.gl as any).getExtension('WEBGL_memory_info');
    if (memoryInfo) {
      limits.totalAvailable = memoryInfo.MEMORY_AVAILABLE || undefined;
    }
    
    return limits;
  }
  
  /**
   * Helper to create shader program
   */
  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const vs = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    this.gl.shaderSource(vs, vsSource);
    this.gl.compileShader(vs);
    
    const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
    this.gl.shaderSource(fs, fsSource);
    this.gl.compileShader(fs);
    
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      this.gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }
  
  /**
   * Export profile as JSON
   */
  exportProfile(profile: PerformanceProfile): string {
    return JSON.stringify(profile, null, 2);
  }
  
  /**
   * Generate HTML report
   */
  generateHTMLReport(profile: PerformanceProfile): string {
    const formatBytes = (bytes: number) => {
      if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB/s`;
      if (bytes > 1e6) return `${(bytes / 1e6).toFixed(2)} MB/s`;
      if (bytes > 1e3) return `${(bytes / 1e3).toFixed(2)} KB/s`;
      return `${bytes} B/s`;
    };
    
    const formatNumber = (num: number) => {
      if (num > 1e9) return `${(num / 1e9).toFixed(2)}B`;
      if (num > 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num > 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toFixed(0);
    };
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>WebGL Performance Profile</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
    .section { margin: 20px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #ddd; }
    .metric { display: flex; justify-content: space-between; margin: 8px 0; }
    .metric-label { font-weight: bold; }
    .metric-value { color: #666; }
    .good { color: #4caf50; }
    .warning { color: #ff9800; }
    .bad { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
    .extensions { max-height: 200px; overflow-y: auto; }
    .extension { padding: 4px; background: #e8f5e9; margin: 2px 0; border-radius: 2px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WebGL Performance Profile</h1>
    <p>Generated: ${new Date(profile.timestamp).toLocaleString()}</p>
    
    <div class="section">
      <h2>Device Information</h2>
      <div class="card">
        <div class="metric"><span class="metric-label">Vendor:</span><span class="metric-value">${profile.deviceInfo.vendor}</span></div>
        <div class="metric"><span class="metric-label">Renderer:</span><span class="metric-value">${profile.deviceInfo.renderer}</span></div>
        <div class="metric"><span class="metric-label">WebGL Version:</span><span class="metric-value">${profile.deviceInfo.glVersion}</span></div>
        <div class="metric"><span class="metric-label">GLSL Version:</span><span class="metric-value">${profile.deviceInfo.shadingLanguageVersion}</span></div>
      </div>
    </div>
    
    <div class="section">
      <h2>Performance Metrics</h2>
      <div class="grid">
        <div class="card">
          <h3>Rendering Performance</h3>
          <div class="metric">
            <span class="metric-label">Triangle Rate:</span>
            <span class="metric-value ${profile.performance.triangleRate > 1e8 ? 'good' : profile.performance.triangleRate > 1e7 ? 'warning' : 'bad'}">
              ${formatNumber(profile.performance.triangleRate)} vertices/sec
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">Fill Rate:</span>
            <span class="metric-value ${profile.performance.fillRate > 1e9 ? 'good' : profile.performance.fillRate > 1e8 ? 'warning' : 'bad'}">
              ${formatNumber(profile.performance.fillRate)} pixels/sec
            </span>
          </div>
        </div>
        
        <div class="card">
          <h3>Upload Performance</h3>
          <div class="metric">
            <span class="metric-label">Texture Upload:</span>
            <span class="metric-value">${formatBytes(profile.performance.textureUploadRate)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Buffer Upload:</span>
            <span class="metric-value">${formatBytes(profile.performance.bufferUploadRate)}</span>
          </div>
        </div>
        
        <div class="card">
          <h3>Compilation</h3>
          <div class="metric">
            <span class="metric-label">Shader Compile Time:</span>
            <span class="metric-value ${profile.performance.shaderCompilationTime < 10 ? 'good' : profile.performance.shaderCompilationTime < 50 ? 'warning' : 'bad'}">
              ${profile.performance.shaderCompilationTime.toFixed(2)} ms
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>Capabilities & Limits</h2>
      <div class="grid">
        <div class="card">
          <h3>Texture Limits</h3>
          <table>
            <tr><td>Max Texture Size</td><td>${profile.limits.maxTextureSize}</td></tr>
            <tr><td>Max Cube Map Size</td><td>${profile.limits.maxCubeMapTextureSize}</td></tr>
            <tr><td>Max Texture Units</td><td>${profile.limits.maxTextureImageUnits}</td></tr>
            ${profile.limits.max3DTextureSize ? `<tr><td>Max 3D Texture Size</td><td>${profile.limits.max3DTextureSize}</td></tr>` : ''}
          </table>
        </div>
        
        <div class="card">
          <h3>Shader Limits</h3>
          <table>
            <tr><td>Max Vertex Attributes</td><td>${profile.limits.maxVertexAttribs}</td></tr>
            <tr><td>Max Vertex Uniforms</td><td>${profile.limits.maxVertexUniformVectors}</td></tr>
            <tr><td>Max Fragment Uniforms</td><td>${profile.limits.maxFragmentUniformVectors}</td></tr>
            <tr><td>Max Varying Vectors</td><td>${profile.limits.maxVaryingVectors}</td></tr>
          </table>
        </div>
        
        <div class="card">
          <h3>Framebuffer Limits</h3>
          <table>
            <tr><td>Max Renderbuffer Size</td><td>${profile.limits.maxRenderBufferSize}</td></tr>
            ${profile.limits.maxDrawBuffers ? `<tr><td>Max Draw Buffers</td><td>${profile.limits.maxDrawBuffers}</td></tr>` : ''}
            ${profile.limits.maxColorAttachments ? `<tr><td>Max Color Attachments</td><td>${profile.limits.maxColorAttachments}</td></tr>` : ''}
            ${profile.limits.maxSamples ? `<tr><td>Max Samples</td><td>${profile.limits.maxSamples}</td></tr>` : ''}
          </table>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>WebGL Features</h2>
      <div class="grid">
        <div class="card">
          <h3>Core Features</h3>
          <div class="metric"><span class="metric-label">WebGL 2:</span><span class="metric-value ${profile.capabilities.webgl2 ? 'good' : 'warning'}">${profile.capabilities.webgl2 ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">Float Color Buffer:</span><span class="metric-value">${profile.capabilities.ext.colorBufferFloat ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">Half Float Color Buffer:</span><span class="metric-value">${profile.capabilities.ext.colorBufferHalfFloat ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">Depth Texture:</span><span class="metric-value">${profile.capabilities.ext.depthTexture ? 'Yes' : 'No'}</span></div>
        </div>
        
        <div class="card">
          <h3>Advanced Features</h3>
          <div class="metric"><span class="metric-label">GPU Timers:</span><span class="metric-value">${profile.capabilities.ext.timer !== 'none' ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">Instancing:</span><span class="metric-value">${profile.capabilities.ext.instanced ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">VAOs:</span><span class="metric-value">${profile.capabilities.ext.vao ? 'Yes' : 'No'}</span></div>
          <div class="metric"><span class="metric-label">MRT:</span><span class="metric-value">${profile.capabilities.ext.mrt ? 'Yes' : 'No'}</span></div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>Extensions (${profile.extensions.length})</h2>
      <div class="extensions">
        ${profile.extensions.map(ext => `<div class="extension">${ext}</div>`).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>Export Data</h2>
      <button onclick="downloadJSON()">Download JSON Report</button>
    </div>
  </div>
  
  <script>
    const profileData = ${JSON.stringify(profile)};
    
    function downloadJSON() {
      const dataStr = JSON.stringify(profileData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', 'webgl-performance-profile-' + Date.now() + '.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>
    `;
  }
}