# IMPLEMENTATION BRIEF — WebGL Debugging Toolkit (Drop-in Spec)

**Role**: You are an expert staff engineer implementing a production-ready WebGL debugging toolkit that works with **WebGL1 & WebGL2**, raw GL and **Three.js**, with minimal overhead and safe fallbacks. Before implementing this plan, use context7 MCP to ensure the plan is correct and up to date. 

**Primary outcomes**

1. In-app overlay panels: **Stats**, **Resources**, **GPU Timers**, **FBO Inspector**, **Shader Errors**, **Device**.
2. Core capabilities: accurate per-frame counters (including instancing), resource lifecycle + **estimated** memory, GPU timing with disjoint checks, robust FBO visualization (float/half/depth/stencil rules), tidy shader error mapping with `#line`, **Spector.js** metadata, and a **Three.js** adapter.
3. Modes: `off` (prod), `sampled` (low overhead), `full` (deep debug). Build flag to tree-shake from production.

---

## 0) Folder layout (monorepo friendly)

```
webgl-tools/
  packages/
    core/                 # instrumentation & capability detection
    overlay/              # React UI panels
    perfpage/             # device snapshot SPA
    spector-bridge/       # __SPECTOR_Metadata helpers
    three-adapter/        # Three.js integ
    examples/             # raw GL and Three demos
  apps/
    playground/           # Next.js playground for demos
```

> If not using a monorepo, collapse into `src/` with subfolders.

---

## 1) Capability Probe (single source of truth)

Create `packages/core/src/caps.ts`:

```ts
export type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface Capabilities {
  webgl2: boolean;
  ext: {
    instanced: boolean;           // ANGLE_instanced_arrays (GL1) or core (GL2)
    vao: boolean;                 // OES_vertex_array_object (GL1) or core (GL2)
    mrt: boolean;                 // WEBGL_draw_buffers (GL1) or core drawBuffers (GL2)
    timer: 'none' | 'webgl1' | 'webgl2';
    depthTexture: boolean;        // WEBGL_depth_texture (GL1) or core (GL2)
    colorBufferFloat: boolean;    // EXT/WEBGL_color_buffer_float
    colorBufferHalfFloat: boolean;// EXT_color_buffer_half_float (GL2) or OES_half_float+ext
    debugRendererInfo: boolean;   // WEBGL_debug_renderer_info
  };
}

export function detectCapabilities(gl: GL): Capabilities {
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const get = (name: string) => gl.getExtension(name);

  const hasTimerGL1 = !!get('EXT_disjoint_timer_query');
  const hasTimerGL2 = !!get('EXT_disjoint_timer_query_webgl2');

  return {
    webgl2: isGL2,
    ext: {
      instanced: isGL2 || !!get('ANGLE_instanced_arrays'),
      vao: isGL2 || !!get('OES_vertex_array_object'),
      mrt: isGL2 || !!get('WEBGL_draw_buffers'),
      timer: isGL2 ? (hasTimerGL2 ? 'webgl2' : 'none') : (hasTimerGL1 ? 'webgl1' : 'none'),
      depthTexture: isGL2 || !!get('WEBGL_depth_texture'),
      colorBufferFloat: !!(get('EXT_color_buffer_float') || get('WEBGL_color_buffer_float')),
      colorBufferHalfFloat: !!get('EXT_color_buffer_half_float'),
      debugRendererInfo: !!get('WEBGL_debug_renderer_info'),
    }
  };
}
```

---

## 2) Public API surface

Create `packages/core/src/api.ts`:

```ts
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
```

---

## 3) Core counters & GL wrapping (low overhead; instancing covered)

Create `packages/core/src/instrument.ts`:

```ts
import type { GL } from './caps';

export interface CounterState {
  frameId: number;
  drawCalls: number;
  instancedDrawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  textureBinds: number;
  shaderSwitches: number;
  bufferUploads: number;
  postPasses: number;
  custom: Record<string, number>;
}

export function newCounters(): CounterState {
  return {
    frameId: 0,
    drawCalls: 0,
    instancedDrawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    bufferUploads: 0,
    postPasses: 0,
    custom: {},
  };
}

export function estimatePrims(mode: number, count: number): { tris: number; lines: number; points: number } {
  // TRIANGLES/STRIP/FAN etc. Points/Lines tracked separately
  switch (mode) {
    case 0x0004: /* TRIANGLES */       return { tris: Math.max(0, Math.floor(count/3)), lines: 0, points: 0 };
    case 0x0005: /* TRIANGLE_STRIP */  return { tris: Math.max(0, count - 2), lines: 0, points: 0 };
    case 0x0006: /* TRIANGLE_FAN */    return { tris: Math.max(0, count - 2), lines: 0, points: 0 };
    case 0x0001: /* LINES */           return { tris: 0, lines: Math.max(0, Math.floor(count/2)), points: 0 };
    case 0x0003: /* LINE_STRIP */      return { tris: 0, lines: Math.max(0, count - 1), points: 0 };
    case 0x0002: /* LINE_LOOP */       return { tris: 0, lines: Math.max(0, count), points: 0 };
    case 0x0000: /* POINTS */          return { tris: 0, lines: 0, points: count };
    default:                            return { tris: 0, lines: 0, points: 0 };
  }
}

export interface WrapOptions {
  trackBinds?: boolean;
  trackPrograms?: boolean;
  trackInstancing?: boolean;
}

export function wrapGL(gl: GL, counters: CounterState, opts: WrapOptions): GL {
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const anyGL = gl as any;

  // drawArrays
  const _drawArrays = gl.drawArrays.bind(gl);
  gl.drawArrays = function(mode: number, first: number, count: number) {
    const prims = estimatePrims(mode, count);
    counters.drawCalls++;
    counters.triangles += prims.tris;
    counters.lines += prims.lines;
    counters.points += prims.points;
    return _drawArrays(mode, first, count);
  };

  // drawElements
  const _drawElements = gl.drawElements.bind(gl);
  gl.drawElements = function(mode: number, count: number, type: number, offset: number) {
    const prims = estimatePrims(mode, count);
    counters.drawCalls++;
    counters.triangles += prims.tris;
    counters.lines += prims.lines;
    counters.points += prims.points;
    return _drawElements(mode, count, type, offset);
  };

  if (opts.trackInstancing) {
    // GL2 instanced
    if (isGL2) {
      const _dai = (gl as WebGL2RenderingContext).drawArraysInstanced!.bind(gl);
      (gl as WebGL2RenderingContext).drawArraysInstanced = function(mode, first, count, primcount) {
        const prims = estimatePrims(mode, count);
        counters.drawCalls++;
        counters.instancedDrawCalls++;
        counters.triangles += prims.tris * primcount;
        counters.lines += prims.lines * primcount;
        counters.points += prims.points * primcount;
        return _dai(mode, first, count, primcount);
      };
      const _dei = (gl as WebGL2RenderingContext).drawElementsInstanced!.bind(gl);
      (gl as WebGL2RenderingContext).drawElementsInstanced = function(mode, count, type, offset, primcount) {
        const prims = estimatePrims(mode, count);
        counters.drawCalls++;
        counters.instancedDrawCalls++;
        counters.triangles += prims.tris * primcount;
        counters.lines += prims.lines * primcount;
        counters.points += prims.points * primcount;
        return _dei(mode, count, type, offset, primcount);
      };
    } else {
      // GL1 ANGLE_instanced_arrays
      const ANGLE = anyGL.getExtension && anyGL.getExtension('ANGLE_instanced_arrays');
      if (ANGLE) {
        const _daiA = ANGLE.drawArraysInstancedANGLE.bind(ANGLE);
        ANGLE.drawArraysInstancedANGLE = function(mode: number, first: number, count: number, primcount: number) {
          const prims = estimatePrims(mode, count);
          counters.drawCalls++;
          counters.instancedDrawCalls++;
          counters.triangles += prims.tris * primcount;
          counters.lines += prims.lines * primcount;
          counters.points += prims.points * primcount;
          return _daiA(mode, first, count, primcount);
        };
        const _deiA = ANGLE.drawElementsInstancedANGLE.bind(ANGLE);
        ANGLE.drawElementsInstancedANGLE = function(mode: number, count: number, type: number, offset: number, primcount: number) {
          const prims = estimatePrims(mode, count);
          counters.drawCalls++;
          counters.instancedDrawCalls++;
          counters.triangles += prims.tris * primcount;
          counters.lines += prims.lines * primcount;
          counters.points += prims.points * primcount;
          return _deiA(mode, count, type, offset, primcount);
        };
      }
    }
  }

  if (opts.trackBinds) {
    const _bindTexture = gl.bindTexture.bind(gl);
    gl.bindTexture = function(target: number, tex: WebGLTexture | null) {
      if (tex) counters.textureBinds++;
      return _bindTexture(target, tex);
    };
  }

  if (opts.trackPrograms) {
    const _useProgram = gl.useProgram.bind(gl);
    let lastProg: WebGLProgram | null = null;
    gl.useProgram = function(prog: WebGLProgram | null) {
      if (prog !== lastProg) {
        counters.shaderSwitches++;
        lastProg = prog;
      }
      return _useProgram(prog);
    };
  }

  return gl;
}
```

---

## 4) Resource tracker (counts + **estimates**)

Create `packages/core/src/resources.ts`:

```ts
import type { GL } from './caps';
import type { GPUResource, ResourceKind } from './api';

export interface ResourceTracker {
  onBufferUpload(bytes: number): void; // increment bufferUploads + mark lastUsed
  list: GPUResource[];
  byKind: Record<ResourceKind, number>;
  estBytes: number;
}

export function makeResourceTracker(gl: GL, opts: { logCreates?: boolean }): ResourceTracker {
  const list: GPUResource[] = [];
  const idMap = new WeakMap<object, string>();
  const byKind: Record<ResourceKind, number> = {
    texture:0, buffer:0, shader:0, program:0, framebuffer:0, renderbuffer:0, vao:0
  };
  let estBytes = 0;
  let nextId = 1;

  const now = () => performance.now();
  const add = (obj: object, type: ResourceKind, label?: string, meta?: any) => {
    const id = `${type.slice(0,3)}_${nextId++}`;
    idMap.set(obj, id);
    byKind[type]++;
    const r: GPUResource = { id, type, createdAt: now(), lastUsed: now(), label, meta };
    list.push(r);
    if (opts.logCreates) console.log('[ResourceCreated]', type, id, meta || '');
    return r;
  };
  const del = (obj: object, type: ResourceKind) => {
    const id = idMap.get(obj);
    if (!id) return;
    const idx = list.findIndex(r => r.id === id);
    if (idx >= 0) {
      const r = list[idx];
      if (r.estBytes) estBytes -= r.estBytes;
      list.splice(idx,1);
      byKind[type] = Math.max(0, byKind[type]-1);
    }
    idMap.delete(obj);
  };

  // Patch GL creators/deleters
  const _createTexture = gl.createTexture.bind(gl);
  (gl as any).createTexture = function() {
    const tex = _createTexture();
    if (tex) add(tex, 'texture', undefined, { stack: captureStack() });
    return tex;
  };
  const _deleteTexture = gl.deleteTexture.bind(gl);
  (gl as any).deleteTexture = function(tex: WebGLTexture | null) {
    if (tex) del(tex, 'texture');
    return _deleteTexture(tex);
  };

  const _createBuffer = gl.createBuffer.bind(gl);
  (gl as any).createBuffer = function() {
    const buf = _createBuffer();
    if (buf) add(buf, 'buffer', undefined, { stack: captureStack() });
    return buf;
  };
  const _deleteBuffer = gl.deleteBuffer.bind(gl);
  (gl as any).deleteBuffer = function(buf: WebGLBuffer | null) {
    if (buf) del(buf, 'buffer');
    return _deleteBuffer(buf);
  };

  const _createFramebuffer = gl.createFramebuffer.bind(gl);
  (gl as any).createFramebuffer = function() {
    const f = _createFramebuffer();
    if (f) add(f, 'framebuffer');
    return f;
  };
  const _deleteFramebuffer = gl.deleteFramebuffer.bind(gl);
  (gl as any).deleteFramebuffer = function(fb: WebGLFramebuffer | null) {
    if (fb) del(fb, 'framebuffer');
    return _deleteFramebuffer(fb);
  };

  const _createRenderbuffer = gl.createRenderbuffer.bind(gl);
  (gl as any).createRenderbuffer = function() {
    const rb = _createRenderbuffer();
    if (rb) add(rb, 'renderbuffer');
    return rb;
  };
  const _deleteRenderbuffer = gl.deleteRenderbuffer.bind(gl);
  (gl as any).deleteRenderbuffer = function(rb: WebGLRenderbuffer | null) {
    if (rb) del(rb, 'renderbuffer');
    return _deleteRenderbuffer(rb);
  };

  const _createShader = gl.createShader.bind(gl);
  (gl as any).createShader = function(type: number) {
    const sh = _createShader(type);
    if (sh) add(sh, 'shader', undefined, { type });
    return sh;
  };
  const _deleteShader = gl.deleteShader.bind(gl);
  (gl as any).deleteShader = function(sh: WebGLShader | null) {
    if (sh) del(sh, 'shader');
    return _deleteShader(sh);
  };

  const _createProgram = gl.createProgram.bind(gl);
  (gl as any).createProgram = function() {
    const pr = _createProgram();
    if (pr) add(pr, 'program');
    return pr;
  };
  const _deleteProgram = gl.deleteProgram.bind(gl);
  (gl as any).deleteProgram = function(pr: WebGLProgram | null) {
    if (pr) del(pr, 'program');
    return _deleteProgram(pr);
  };

  // VAO (GL2 or OES)
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const vaoAPI = isGL2 ? gl : (gl as any).getExtension && (gl as any).getExtension('OES_vertex_array_object');
  if (vaoAPI) {
    const _createVAO = vaoAPI.createVertexArray?.bind(vaoAPI) || vaoAPI.createVertexArrayOES?.bind(vaoAPI);
    const _deleteVAO = vaoAPI.deleteVertexArray?.bind(vaoAPI) || vaoAPI.deleteVertexArrayOES?.bind(vaoAPI);
    if (_createVAO && _deleteVAO) {
      vaoAPI.createVertexArray = function() {
        const vao = _createVAO();
        if (vao) add(vao, 'vao');
        return vao;
      };
      vaoAPI.deleteVertexArray = function(v: any) {
        if (v) del(v, 'vao');
        return _deleteVAO(v);
      };
    }
  }

  function onTextureUpload(width: number, height: number, channelsBpp: number) {
    const bytes = width * height * channelsBpp;
    estBytes += bytes;
    // attach to currently bound texture if tracked…
  }

  function captureStack(): string {
    const s = new Error().stack || '';
    return s.split('\n').slice(3,9).join('\n');
  }

  return {
    onBufferUpload(bytes: number) { estBytes += bytes; },
    list, byKind, estBytes
  };
}
```

> NOTE: Estimation for textures happens when you intercept `texImage2D/3D`/`texStorage*`. Add a small helper that maps **internalFormat/type** to **bytes per pixel** (see §8).

---

## 5) GPU timers (both WebGL1 & WebGL2; ring-buffer; disjoint checks)

Create `packages/core/src/timers.ts`:

```ts
import type { GL } from './caps';

type Timings = { last?: number; sum: number; count: number; max: number; samples: number[]; };
export class GPUTimers {
  private gl: GL;
  private isGL2: boolean;
  private extGL1: any;
  private extGL2: any;
  private active: { name: string; q: any }[] = [];
  private pending: { name: string; q: any }[] = [];
  private map: Record<string, Timings> = {};

  constructor(gl: GL) {
    this.gl = gl;
    this.isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    this.extGL1 = (gl as any).getExtension && (gl as any).getExtension('EXT_disjoint_timer_query');
    this.extGL2 = (gl as any).getExtension && (gl as any).getExtension('EXT_disjoint_timer_query_webgl2');
  }

  supported() { return !!(this.extGL1 || this.extGL2); }

  begin(name: string) {
    if (!this.supported()) return;
    const q = this.isGL2 ? (this.gl as WebGL2RenderingContext).createQuery() : this.extGL1.createQueryEXT();
    if (!q) return;
    if (this.isGL2) (this.gl as WebGL2RenderingContext).beginQuery(this.extGL2.TIME_ELAPSED_EXT, q);
    else this.extGL1.beginQueryEXT(this.extGL1.TIME_ELAPSED_EXT, q);
    this.active.push({ name, q });
  }

  end() {
    if (!this.supported()) return;
    const item = this.active.pop();
    if (!item) return;
    if (this.isGL2) (this.gl as WebGL2RenderingContext).endQuery(this.extGL2.TIME_ELAPSED_EXT);
    else this.extGL1.endQueryEXT(this.extGL1.TIME_ELAPSED_EXT);
    this.pending.push(item);
  }

  // Call once per frame after draws
  poll() {
    if (!this.supported()) return;
    const gl = this.gl as any;
    const disjoint = this.isGL2
      ? gl.getParameter(this.extGL2.GPU_DISJOINT_EXT)
      : gl.getParameter(this.extGL1.GPU_DISJOINT_EXT);
    if (disjoint) {
      // drop all pending to avoid bogus data
      this.pending.length = 0;
      return;
    }

    for (let i = 0; i < this.pending.length; ) {
      const { name, q } = this.pending[i];
      const available = this.isGL2
        ? gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)
        : this.extGL1.getQueryObjectEXT(q, this.extGL1.QUERY_RESULT_AVAILABLE_EXT);
      if (!available) { i++; continue; }

      const ns = this.isGL2
        ? gl.getQueryParameter(q, gl.QUERY_RESULT)
        : this.extGL1.getQueryObjectEXT(q, this.extGL1.QUERY_RESULT_EXT);
      const ms = ns / 1e6;

      if (this.isGL2) gl.deleteQuery(q); else this.extGL1.deleteQueryEXT(q);
      this.pending.splice(i, 1);

      const t = this.map[name] ?? (this.map[name] = { last: undefined, sum: 0, count: 0, max: 0, samples: [] });
      t.last = ms; t.sum += ms; t.count++; t.max = Math.max(t.max, ms);
      t.samples.push(ms); if (t.samples.length > 120) t.samples.shift();
    }
  }

  stats() {
    const out: Record<string, { last?: number; avg: number; p95: number; max: number }> = {};
    for (const [k, t] of Object.entries(this.map)) {
      const sorted = [...t.samples].sort((a,b)=>a-b);
      const p95 = sorted.length ? sorted[Math.max(0, Math.floor(sorted.length*0.95)-1)] : 0;
      out[k] = { last: t.last, avg: t.count ? t.sum/t.count : 0, p95, max: t.max };
    }
    return out;
  }
}
```

---

## 6) Shader error reporter with `#line` mapping

Create `packages/core/src/shaderErrors.ts`:

```ts
export interface SourceChunk { file: string; code: string; }
export interface MappedSource { code: string; map: { glslLine: number; file: string; fileLine: number }[]; }

// Concatenate chunks with #line so GL error logs map back to files
export function concatWithLineDirectives(chunks: SourceChunk[]): MappedSource {
  const map: { glslLine: number; file: string; fileLine: number }[] = [];
  let code = '';
  let glslLine = 1;
  for (const ch of chunks) {
    code += `#line 1\n`;               // reset to 1 for file
    const lines = ch.code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      map.push({ glslLine, file: ch.file, fileLine: i+1 });
      code += lines[i] + '\n';
      glslLine++;
    }
  }
  return { code, map };
}

export interface ParsedError { file: string; line: number; message: string; raw: string; }
export function parseGLSLInfoLog(info: string, mapped: MappedSource): ParsedError[] {
  // Handles "ERROR: 0:123: message" and similar
  const out: ParsedError[] = [];
  const re = /ERROR:\s*\d+:(\d+):\s*(.*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info)) !== null) {
    const glslLine = parseInt(m[1], 10);
    const entry = mapped.map.find(e => e.glslLine === glslLine);
    if (entry) out.push({ file: entry.file, line: entry.fileLine, message: m[2], raw: m[0] });
  }
  return out;
}
```

---

## 7) FBO/RTT Inspector (robust visualization)

Create `packages/core/src/fbo.ts` (kernel; UI comes in overlay):

```ts
import type { GL } from './caps';

export interface FBOViewOptions {
  channelMask?: [boolean, boolean, boolean, boolean];
  normalize?: boolean;    // auto fit min/max
  useLogScale?: boolean;
  near?: number;          // for depth linearization
  far?: number;
}

export class FBODebugger {
  constructor(private gl: GL) {}

  // Strategy:
  // 1) For fixed color attachments: visualize with fullscreen shader, read as RGBA/UNSIGNED_BYTE if needed.
  // 2) For float/half: if float readback unsupported, draw to RGBA8 intermediate via shader, then read.
  // 3) For depth: sample a depth texture (requires depthTexture support), linearize.
  // 4) For stencil: visualize via stencil test overlay (no direct sampling).

  // Provide hooks for UI to set current FBO/attachment/level/layer (implementation engine-specific).
}
```

You’ll implement the shaders in `packages/overlay` later:

* `vis.frag` (color visualize with normalize/log + channel mask)
* `depth_vis.frag` (linearize depth)
* “stencil overlay” uses stencil test state to show mask coverage (no sampling).

---

## 8) Texture size **estimates** (formats → bytes-per-pixel)

Create `packages/core/src/estimates.ts`:

```ts
export function bppFor(internalFormat: number, type: number): number {
  // Conservative defaults; you can extend with engine-known formats.
  // Common combos: RGBA8 -> 4, RGBA16F -> 8, RGBA32F -> 16
  // HALF/FLOAT multiply per-channel sizes.
  // Depth/stencil approximations:
  //   DEPTH_COMPONENT24 ~ 4, DEPTH24_STENCIL8 ~ 4
  // NOTE: compressed formats vary; if known, map block sizes to effective bpp.
  switch (internalFormat) {
    // You may specialize on GL constants where available
    default:
      // Fallback on type
      if (type === 0x1406 /* FLOAT */) return 16;     // assume RGBA32F worst-case
      if ((type as any) === 0x8D61 /* HALF_FLOAT */ || (type as any) === 0x140B /* HALF_FLOAT_OES */) return 8; // RGBA16F
      return 4; // RGBA8-like
  }
}
```

> Call this when intercepting `texImage2D/3D` or `texStorage*` to update `estBytes`. Always label **“est.”** in UI.

---

## 9) Spector.js bridge

Create `packages/spector-bridge/src/index.ts`:

```ts
export interface ProgramMeta {
  file?: string; pass?: string; variant?: string;
  defines?: Record<string,string>;
}

export function attachSpectorMetadata(program: WebGLProgram, meta: ProgramMeta) {
  (program as any).__SPECTOR_Metadata = { ...meta, ts: Date.now() };
}
```

---

## 10) Three.js adapter

Create `packages/three-adapter/src/index.ts`:

```ts
import type { WebGLDebuggerAPI } from '@webgl-tools/core';

export function attachThreeAdapter(renderer: any, dbg: WebGLDebuggerAPI) {
  // Use renderer.info.* where accurate, but keep core counters as ground truth
  // Optionally patch EffectComposer Pass.render to dbg.pushPass(name)
  const info = renderer.info;
  const _render = renderer.render.bind(renderer);
  renderer.render = function(scene: any, camera: any) {
    // Before render: maybe reset pass count
    const before = { calls: info.render.calls, triangles: info.render.triangles };
    _render(scene, camera);
    // After: compare deltas; if differs, override dbg counters or just surface info.*
  };
}
```

---

## 11) Core orchestrator & public class

Create `packages/core/src/index.ts`:

```ts
import { detectCapabilities, type GL } from './caps';
import { newCounters, wrapGL, type CounterState } from './instrument';
import { makeResourceTracker } from './resources';
import { GPUTimers } from './timers';
import { concatWithLineDirectives, parseGLSLInfoLog } from './shaderErrors';
import type { DebuggerOptions, WebGLDebuggerAPI, MetricSnapshot } from './api';

export class WebGLDebugger implements WebGLDebuggerAPI {
  public caps = detectCapabilities(this.gl);
  private counters: CounterState = newCounters();
  private timers = new GPUTimers(this.gl);
  private resources = makeResourceTracker(this.gl, { logCreates: !!this.opts.logCreates });
  private frameStart = 0;
  private lastFpsTs = performance.now();
  private fpsSamples: number[] = [];
  private mode: 'off'|'sampled'|'full';
  private sampleRate: number;

  constructor(private gl: GL, private opts: DebuggerOptions = {}) {
    this.mode = opts.mode ?? 'sampled';
    this.sampleRate = opts.sampleRate ?? 0.25;

    // Narrow wrapping; enable instancing, binds, program switches only in sampled/full
    const active = this.mode !== 'off';
    wrapGL(this.gl, this.counters, {
      trackBinds: active,
      trackPrograms: active,
      trackInstancing: active,
    });
  }

  beginFrame() {
    this.counters.frameId++;
    this.frameStart = performance.now();
    // reset per-frame counters
    this.counters.drawCalls = this.counters.instancedDrawCalls = 0;
    this.counters.triangles = this.counters.points = this.counters.lines = 0;
    this.counters.textureBinds = this.counters.shaderSwitches = 0;
    this.counters.bufferUploads = 0;
    this.counters.postPasses = 0;
    this.counters.custom = {};
    // optionally begin a frame timer sample (probabilistic in sampled mode)
    if (this.shouldSample()) this.timers.begin('__frame');
  }

  endFrame() {
    const dur = performance.now() - this.frameStart;
    const fps = 1000 / dur;
    this.pushFps(fps);
    if (this.shouldSample()) this.timers.end();
    this.timers.poll(); // collect pending results
  }

  private shouldSample() { return this.mode === 'full' || (this.mode === 'sampled' && Math.random() < this.sampleRate); }

  private pushFps(v: number) {
    this.fpsSamples.push(v);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
  }

  getSnapshot(): MetricSnapshot {
    const avg = this.fpsSamples.reduce((a,b)=>a+b,0) / (this.fpsSamples.length || 1);
    const frameStats = this.timers.stats()['__frame'];
    return {
      ts: Date.now(),
      frameId: this.counters.frameId,
      fps: avg || 0,
      cpuMs: 1000 / (avg || 60),
      gpuMs: frameStats?.last,
      drawCalls: this.counters.drawCalls,
      instancedDrawCalls: this.counters.instancedDrawCalls,
      triangles: this.counters.triangles,
      points: this.counters.points,
      lines: this.counters.lines,
      postPasses: this.counters.postPasses,
      textureBinds: this.counters.textureBinds,
      shaderSwitches: this.counters.shaderSwitches,
      bufferUploads: this.counters.bufferUploads,
      custom: { ...this.counters.custom },
    };
  }

  getResources() {
    return { byKind: this.resources.byKind, estBytes: this.resources.estBytes, list: this.resources.list };
  }

  getTimers() { return this.timers.stats(); }

  pushPass(_name: string) { this.counters.postPasses++; }
  incCustom(key: string, delta = 1) { this.counters.custom[key] = (this.counters.custom[key] || 0) + delta; }

  mountOverlay(root?: HTMLElement, _panels?: string[]) { /* implemented in packages/overlay */ }
  unmountOverlay() {}

  exportSession(): string {
    return JSON.stringify({
      device: this.caps, snapshot: this.getSnapshot(),
      resources: this.getResources(), timers: this.getTimers()
    }, null, 2);
  }
}
```

---

## 12) Overlay (React) — minimal scaffolds

Create `packages/overlay/src/Overlay.tsx` with skeletal panels that read from `WebGLDebugger` getters. Panels:

* StatsPanel (shows snapshot + tiny sparklines)
* ResourcesPanel (counts & **est.** MB by kind)
* TimersPanel (avg/p95/max with thresholds)
* FBOInspectorPanel (hooks into `FBODebugger`, kernel in core)
* ShaderErrorsPanel (pretty codeframe from `shaderErrors`)
* DevicePanel (caps; toggle to include debug vendor/renderer)

> Keep updates to once per rAF; memoize derived values.

---

## 13) Performance Page (device snapshot SPA)

Create `packages/perfpage/src/index.tsx`:

* On load, create a GL context, run `detectCapabilities`, dump limits (texture sizes, attributes, draw buffers, texture units…), extensions, UA, DPR, estimated refresh rate (rAF histogram), shader precision table.
* Provide **Copy JSON** and **shareable URL** (base64).
* Include an opt-in toggle to include `WEBGL_debug_renderer_info`.

---

## 14) Example usage (raw WebGL2)

Create `packages/examples/raw/main.ts`:

```ts
import { WebGLDebugger } from '@webgl-tools/core';

const canvas = document.querySelector('canvas')!;
const gl = canvas.getContext('webgl2', { antialias: true })!;
const dbg = new WebGLDebugger(gl, { mode: 'sampled', sampleRate: 0.25, logCreates: true });

function frame() {
  dbg.beginFrame();

  // ... your draws here, optionally:
  // dbg.pushPass('Composite');

  dbg.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// (Optional) mount overlay
import('@webgl-tools/overlay').then(({ mountOverlay }) => mountOverlay(dbg));
```

---

## 15) Acceptance criteria (Definition of Done)

1. **Stats correctness**

   * Draw call counts increase for `drawArrays`, `drawElements`, **and** instanced variants on both GL1 (ANGLE) and GL2.
   * Triangle estimates match mode semantics; instanced multiplies by instance count.
2. **Resource tracker**

   * Creation & deletion tracked for textures, buffers, programs, shaders, FBOs, RBOs, VAOs.
   * Estimated bytes update on first texture upload / bufferData; labeled **“est.”** in UI.
3. **Timers**

   * On a device with timer extension, per-label results (avg/p95/max) appear and drop when `GPU_DISJOINT_EXT` is true.
   * On devices without timers, show **“CPU est.”** where used; never block the main thread.
4. **FBO inspector**

   * Fixed format attachments visualize directly; float/half visualize or blit to RGBA8 when float readback unsupported.
   * Depth visual shows linearized range with near/far; stencil uses state-based overlay (no unsupported sampling).
   * MRT attachments selectable on GL1 (WEBGL\_draw\_buffers) and GL2.
5. **Shader errors**

   * Errors map back to correct file/line when sources are combined with includes via `#line`.
   * WebGL2 shaders enforce `#version 300 es` at line 1.
6. **Perf page**

   * One-shot capability report with opt-in vendor/renderer; copy/export works.
7. **Modes**

   * `off` disables hooks; `sampled` instruments probabilistically; `full` instruments everything each frame.
8. **No-crash guarantee**

   * Missing extensions/features never crash; features gracefully disable with a clear badge in the UI (e.g., “GPU timers unavailable”).

---

## 16) Test plan (at minimum)

* **Unit tests** (estimates, triangle calc, shader error mapping).
* **Headless e2e**: puppeteer to render a tiny scene that uses instancing & MRT; assert counters within reasonable bounds; assert timers appear on devices with supported extensions.
* **Manual matrix**: Chrome/Firefox/Edge (Win/Intel/AMD/NVIDIA), macOS (Apple/Intel), a WebGL1 fallback (Android older WebView).

---

## 17) Stretch goals

* Remote streaming of overlay (WebSocket).
* Record/replay of labeled ranges (metrics only, not full GL).
* WebGPU adapter (keep module boundaries clean).
* Plugin API for custom panels and resource labeling.

---

## 18) Quick integration snippet (copy into any app)

```ts
import { WebGLDebugger } from '@webgl-tools/core';

// 1) Get GL
const canvas = document.querySelector('canvas')!;
const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext;

// 2) Start debugger
const debug = new WebGLDebugger(gl, { mode: 'sampled', sampleRate: 0.3, logCreates: false });

// 3) Render loop
function render() {
  debug.beginFrame();

  // ... your rendering ...

  debug.endFrame();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 4) (Optional) Overlay
import('@webgl-tools/overlay').then(({ mountOverlay }) => mountOverlay(debug));
```

---

### Notes you can hand to the implementer

* **Avoid deep proxies** and per-call `getError`—we only patch the hot paths.
* **Never** promise exact memory usage; display “est.” everywhere you show bytes.
* Prefer **shader visualization** for floats; only read back floats when the extension guarantees it.
* For **Three.js**, use the adapter but keep GL-level counters as ground truth, especially through post FX pipelines.
