export type DebugMode = 'off'|'sampled'|'full';

export interface DebuggerOptions {
  mode?: DebugMode;
  sampleRate?: number;        // e.g., 0.25 = observe 25% frames
  logCreates?: boolean;       // logs resource creation and callsite
  attachSpector?: boolean;    // allow __SPECTOR_Metadata
}

export interface MetricSnapshot {
  ts: number;                 // epoch ms
  frameId: number;            // incrementing
  fps: number;                // moving avg
  cpuMs: number;
  gpuMs?: number;
  drawCalls: number;
  instancedDrawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  postPasses: number;         // app can push
  textureBinds: number;       // perf churn signal
  shaderSwitches: number;     // perf churn signal
  bufferUploads: number;
  custom: Record<string, number>;
}

export type ResourceKind =
  | 'texture'|'buffer'|'shader'|'program'|'framebuffer'|'renderbuffer'|'vao';

export interface GPUResource {
  id: string;                 // e.g., "tex_42"
  type: ResourceKind;
  estBytes?: number;          // estimate only
  createdAt: number;
  lastUsed: number;
  label?: string;             // user label or auto
  meta?: Record<string, any>;
}

export interface WebGLDebuggerAPI {
  beginFrame(): void;
  endFrame(): void;

  // counters
  pushPass(name: string): void;
  incCustom(key: string, delta?: number): void;

  // UI
  mountOverlay(root?: HTMLElement, panels?: string[]): void;
  unmountOverlay(): void;

  // export
  exportSession(): string; // JSON string of snapshot + device + aggregates

  // exposed submodules (for adapters/tests)
  caps: import('./caps').Capabilities;
  getSnapshot(): MetricSnapshot;
  getResources(): { byKind: Record<ResourceKind, number>; estBytes: number; list: GPUResource[]; };
  getTimers(): { [label: string]: { avg: number; p95: number; max: number; last?: number } };
}