import { detectCapabilities, type GL } from './caps';
import { newCounters, wrapGL, type CounterState } from './instrument';
import { makeResourceTracker } from './resources';
import { GPUTimers } from './timers';
import { concatWithLineDirectives, parseGLSLInfoLog } from './shaderErrors';
import type { DebuggerOptions, WebGLDebuggerAPI, MetricSnapshot } from './api';

export class WebGLDebugger implements WebGLDebuggerAPI {
  public caps: ReturnType<typeof detectCapabilities>;
  private counters: CounterState;
  private timers: GPUTimers;
  private resources: ReturnType<typeof makeResourceTracker>;
  private frameStart = 0;
  private lastFpsTs = performance.now();
  private fpsSamples: number[] = [];
  private mode: 'off'|'sampled'|'full';
  private sampleRate: number;

  constructor(private gl: GL, private opts: DebuggerOptions = {}) {
    this.caps = detectCapabilities(this.gl);
    this.counters = newCounters();
    this.timers = new GPUTimers(this.gl);
    this.resources = makeResourceTracker(this.gl, { logCreates: !!this.opts.logCreates });
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

// Re-export public types and utilities
export * from './api';
export * from './caps';
export { concatWithLineDirectives, parseGLSLInfoLog } from './shaderErrors';
export { FBODebugger } from './fbo';
export { bppFor } from './estimates';