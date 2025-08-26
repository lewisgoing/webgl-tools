import type { GL } from './caps';

export interface FBOInspectorOptions {
  maxTextureSize?: number;
  enableFloatInspection?: boolean;
}

export interface PixelInfo {
  x: number;
  y: number;
  rgba: Float32Array;
  normalized: Float32Array;
  hex: string;
}

export interface FBOInfo {
  width: number;
  height: number;
  colorAttachments: number;
  hasDepth: boolean;
  hasStencil: boolean;
  format?: number;
  type?: number;
}

export class FBOInspector {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private readPixelsCanvas: HTMLCanvasElement;
  private isWebGL2: boolean;
  
  constructor(gl: GL, private options: FBOInspectorOptions = {}) {
    this.gl = gl as WebGLRenderingContext | WebGL2RenderingContext;
    this.isWebGL2 = gl instanceof WebGL2RenderingContext;
    
    // Create offscreen canvases for pixel reading
    this.canvas = document.createElement('canvas');
    this.readPixelsCanvas = document.createElement('canvas');
    
    this.options.maxTextureSize = options.maxTextureSize || 4096;
    this.options.enableFloatInspection = options.enableFloatInspection ?? true;
  }
  
  /**
   * Capture the current framebuffer or a specific one
   */
  captureFramebuffer(
    framebuffer?: WebGLFramebuffer | null,
    attachment = 0
  ): ImageData | null {
    const gl = this.gl;
    
    // Store current state
    const currentFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const viewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    
    try {
      // Bind target framebuffer (null = default framebuffer)
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null);
      
      const width = framebuffer ? this.getFramebufferWidth(framebuffer) : viewport[2];
      const height = framebuffer ? this.getFramebufferHeight(framebuffer) : viewport[3];
      
      if (!width || !height) return null;
      
      // Read pixels
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // Create ImageData
      const imageData = new ImageData(width, height);
      
      // Flip Y axis (WebGL coordinate system)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = ((height - 1 - y) * width + x) * 4;
          const dstIdx = (y * width + x) * 4;
          
          imageData.data[dstIdx] = pixels[srcIdx];
          imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
          imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
          imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
        }
      }
      
      return imageData;
      
    } finally {
      // Restore state
      gl.bindFramebuffer(gl.FRAMEBUFFER, currentFBO);
    }
  }
  
  /**
   * Inspect pixel values at specific coordinates
   */
  inspectPixel(
    x: number,
    y: number,
    framebuffer?: WebGLFramebuffer | null
  ): PixelInfo | null {
    const gl = this.gl;
    
    // Store current state
    const currentFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null);
      
      // Read single pixel
      const pixels = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // Convert to float values
      const rgba = new Float32Array([
        pixels[0] / 255,
        pixels[1] / 255,
        pixels[2] / 255,
        pixels[3] / 255
      ]);
      
      // Read float values if supported
      let floatRGBA = rgba;
      if (this.options.enableFloatInspection && this.canReadFloats()) {
        const floatPixels = new Float32Array(4);
        try {
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, floatPixels);
          floatRGBA = floatPixels;
        } catch (e) {
          // Fall back to normalized values
        }
      }
      
      // Convert to hex
      const hex = '#' + Array.from(pixels.slice(0, 3))
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
      
      return {
        x,
        y,
        rgba: floatRGBA,
        normalized: rgba,
        hex
      };
      
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, currentFBO);
    }
  }
  
  /**
   * Get information about a framebuffer
   */
  getFramebufferInfo(framebuffer: WebGLFramebuffer): FBOInfo {
    const gl = this.gl;
    const gl2 = gl as WebGL2RenderingContext;
    
    const currentFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    try {
      const info: FBOInfo = {
        width: 0,
        height: 0,
        colorAttachments: 0,
        hasDepth: false,
        hasStencil: false
      };
      
      // Check color attachments
      const maxColorAttachments = this.isWebGL2 
        ? gl.getParameter(gl2.MAX_COLOR_ATTACHMENTS)
        : 1;
      
      for (let i = 0; i < maxColorAttachments; i++) {
        const attachment = this.isWebGL2
          ? (gl2.COLOR_ATTACHMENT0 + i)
          : gl.COLOR_ATTACHMENT0;
          
        const type = gl.getFramebufferAttachmentParameter(
          gl.FRAMEBUFFER,
          attachment,
          gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE
        );
        
        if (type === gl.TEXTURE) {
          info.colorAttachments++;
          
          if (info.width === 0) {
            const texture = gl.getFramebufferAttachmentParameter(
              gl.FRAMEBUFFER,
              attachment,
              gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME
            );
            
            if (texture) {
              // WebGL doesn't have direct texture size query, would need to track separately
              // For now, use a reasonable default
              info.width = 512;
              info.height = 512;
            }
          }
        }
      }
      
      // Check depth attachment
      const depthType = gl.getFramebufferAttachmentParameter(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE
      );
      info.hasDepth = depthType !== gl.NONE;
      
      // Check stencil attachment
      const stencilType = gl.getFramebufferAttachmentParameter(
        gl.FRAMEBUFFER,
        gl.STENCIL_ATTACHMENT,
        gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE
      );
      info.hasStencil = stencilType !== gl.NONE;
      
      return info;
      
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, currentFBO);
    }
  }
  
  /**
   * Compare two framebuffers and return difference
   */
  compareFramebuffers(
    fb1: WebGLFramebuffer | null,
    fb2: WebGLFramebuffer | null,
    threshold = 0.01
  ): ImageData | null {
    const img1 = this.captureFramebuffer(fb1);
    const img2 = this.captureFramebuffer(fb2);
    
    if (!img1 || !img2 || img1.width !== img2.width || img1.height !== img2.height) {
      return null;
    }
    
    const diff = new ImageData(img1.width, img1.height);
    let maxDiff = 0;
    
    for (let i = 0; i < img1.data.length; i += 4) {
      const r1 = img1.data[i] / 255;
      const g1 = img1.data[i + 1] / 255;
      const b1 = img1.data[i + 2] / 255;
      
      const r2 = img2.data[i] / 255;
      const g2 = img2.data[i + 1] / 255;
      const b2 = img2.data[i + 2] / 255;
      
      const dr = Math.abs(r1 - r2);
      const dg = Math.abs(g1 - g2);
      const db = Math.abs(b1 - b2);
      
      const diffMag = Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
      maxDiff = Math.max(maxDiff, diffMag);
      
      if (diffMag > threshold) {
        // Highlight differences in red
        diff.data[i] = 255;
        diff.data[i + 1] = 0;
        diff.data[i + 2] = 0;
        diff.data[i + 3] = Math.min(255, diffMag * 512);
      } else {
        // Show original with reduced opacity
        diff.data[i] = img1.data[i];
        diff.data[i + 1] = img1.data[i + 1];
        diff.data[i + 2] = img1.data[i + 2];
        diff.data[i + 3] = 64;
      }
    }
    
    return diff;
  }
  
  /**
   * Export framebuffer as blob
   */
  async exportAsBlob(
    framebuffer: WebGLFramebuffer | null,
    format: 'png' | 'jpeg' = 'png',
    quality = 0.95
  ): Promise<Blob | null> {
    const imageData = this.captureFramebuffer(framebuffer);
    if (!imageData) return null;
    
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise((resolve) => {
      this.canvas.toBlob(
        (blob) => resolve(blob),
        `image/${format}`,
        quality
      );
    });
  }
  
  /**
   * Create a visual histogram of pixel values
   */
  createHistogram(
    framebuffer: WebGLFramebuffer | null,
    channel: 'r' | 'g' | 'b' | 'a' | 'luminance' = 'luminance'
  ): Uint32Array {
    const imageData = this.captureFramebuffer(framebuffer);
    if (!imageData) return new Uint32Array(256);
    
    const histogram = new Uint32Array(256);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      let value: number;
      
      switch (channel) {
        case 'r':
          value = imageData.data[i];
          break;
        case 'g':
          value = imageData.data[i + 1];
          break;
        case 'b':
          value = imageData.data[i + 2];
          break;
        case 'a':
          value = imageData.data[i + 3];
          break;
        case 'luminance':
          value = Math.round(
            imageData.data[i] * 0.299 +
            imageData.data[i + 1] * 0.587 +
            imageData.data[i + 2] * 0.114
          );
          break;
      }
      
      histogram[value]++;
    }
    
    return histogram;
  }
  
  private getFramebufferWidth(fb: WebGLFramebuffer): number {
    // WebGL doesn't provide direct texture size query
    // In a real implementation, this would need to track texture sizes
    // when they're created
    return 512; // Default for now
  }
  
  private getFramebufferHeight(fb: WebGLFramebuffer): number {
    // WebGL doesn't provide direct texture size query
    // In a real implementation, this would need to track texture sizes
    // when they're created
    return 512; // Default for now
  }
  
  private canReadFloats(): boolean {
    if (!this.isWebGL2) return false;
    
    const gl2 = this.gl as WebGL2RenderingContext;
    const ext = gl2.getExtension('EXT_color_buffer_float');
    return ext !== null;
  }
}