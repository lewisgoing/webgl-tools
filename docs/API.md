# API Reference

## Core API

### WebGLDebugger

The main class for WebGL debugging and profiling.

```typescript
class WebGLDebugger {
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options?: DebuggerOptions)
}
```

#### Options

```typescript
interface DebuggerOptions {
  mode?: 'off' | 'sampled' | 'full';  // Default: 'sampled'
  sampleRate?: number;                 // Default: 0.25 (25%)
  logCreates?: boolean;                // Default: false
}
```

#### Methods

##### Frame Management
- `beginFrame(): void` - Start frame timing
- `endFrame(): void` - End frame timing and collect metrics

##### Metrics
- `getSnapshot(): MetricSnapshot` - Get current performance metrics
- `getResources(): ResourceInfo` - Get resource tracking information
- `getTimers(): TimerStats` - Get GPU timer statistics

##### Control
- `setMode(mode: 'off' | 'sampled' | 'full'): void` - Change debugging mode
- `resetStats(): void` - Reset accumulated statistics

### Enhanced Features

#### ShaderErrorFormatter

Enhanced shader compilation error reporting.

```typescript
class ShaderErrorFormatter {
  static formatShaderError(
    source: string,
    errorLog: string,
    shaderType: 'vertex' | 'fragment'
  ): FormattedError
}
```

#### FBOInspector

Framebuffer inspection and analysis.

```typescript
class FBOInspector {
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext)
  
  captureFramebuffer(fbo?: WebGLFramebuffer | null): ImageData | null
  captureAsBlob(fbo?: WebGLFramebuffer | null, type?: string): Promise<Blob>
  inspectPixel(x: number, y: number, fbo?: WebGLFramebuffer | null): PixelInfo
  createHistogram(fbo?: WebGLFramebuffer | null, channel?: string): number[]
}
```

#### EnhancedGPUTimers

Hierarchical GPU timing with per-draw-call metrics.

```typescript
class EnhancedGPUTimers {
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext)
  
  beginPass(name: string, metadata?: any): void
  endPass(): void
  timeDrawCall(fn: Function, metadata?: DrawCallMetadata): void
  getBottlenecks(count?: number): Bottleneck[]
  exportTimeline(): string
}
```

#### PerformanceProfiler

Comprehensive device profiling and benchmarking.

```typescript
class PerformanceProfiler {
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext)
  
  async generateProfile(): Promise<PerformanceProfile>
  generateHTMLReport(profile: PerformanceProfile): string
  exportProfile(profile: PerformanceProfile): string
}
```

## Types

### MetricSnapshot

```typescript
interface MetricSnapshot {
  ts: number;
  frameId: number;
  fps: number;
  cpuMs?: number;
  gpuMs?: number;
  drawCalls: number;
  instancedDrawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  textureBinds: number;
  shaderSwitches: number;
  bufferUploads: number;
  custom: Record<string, number>;
}
```

### ResourceInfo

```typescript
interface ResourceInfo {
  byKind: {
    texture: number;
    buffer: number;
    shader: number;
    program: number;
    framebuffer: number;
    renderbuffer: number;
    vao: number;
  };
  estBytes: number;
  list: GPUResource[];
}
```

### PerformanceProfile

```typescript
interface PerformanceProfile {
  timestamp: number;
  deviceInfo: DeviceInfo;
  capabilities: Capabilities;
  limits: WebGLLimits;
  extensions: string[];
  performance: BenchmarkResults;
  memoryEstimates: MemoryInfo;
}
```