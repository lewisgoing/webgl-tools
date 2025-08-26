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