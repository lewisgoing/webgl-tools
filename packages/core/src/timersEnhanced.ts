import type { GL } from './caps';

export interface TimerQuery {
  id: string;
  label: string;
  type: 'frame' | 'draw' | 'compute' | 'clear' | 'pass' | 'custom';
  startTime: number;
  endTime?: number;
  gpuTime?: number;
  cpuTime?: number;
  metadata?: Record<string, any>;
  children?: TimerQuery[];
}

export interface TimerStats {
  average: number;
  min: number;
  max: number;
  last: number;
  samples: number;
}

export interface DrawCallInfo {
  primitiveMode: string;
  vertexCount: number;
  instanceCount?: number;
  programId?: string;
  shaderName?: string;
}

/**
 * Enhanced GPU timer system with hierarchical timing and per-draw-call measurement
 */
export class EnhancedGPUTimers {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private ext: any; // Timer query extension
  private isWebGL2: boolean;
  
  private queries = new Map<string, any>(); // GPU query objects
  private activeTimers: TimerQuery[] = [];
  private completedTimers: TimerQuery[] = [];
  private timerStack: TimerQuery[] = [];
  
  private frameTimeline: TimerQuery[] = [];
  private stats = new Map<string, number[]>();
  
  private drawCallIndex = 0;
  private enabled = true;
  
  constructor(gl: GL) {
    this.gl = gl as WebGLRenderingContext | WebGL2RenderingContext;
    this.isWebGL2 = gl instanceof WebGL2RenderingContext;
    
    // Get timer extension
    if (this.isWebGL2) {
      this.ext = (gl as WebGL2RenderingContext).getExtension('EXT_disjoint_timer_query_webgl2');
    } else {
      this.ext = gl.getExtension('EXT_disjoint_timer_query');
    }
    
    if (!this.ext) {
      console.warn('GPU timer queries not supported');
      this.enabled = false;
    }
  }
  
  /**
   * Begin a new timing section
   */
  begin(label: string, type: TimerQuery['type'] = 'custom', metadata?: any): void {
    if (!this.enabled) return;
    
    const timer: TimerQuery = {
      id: `${label}_${Date.now()}_${Math.random()}`,
      label,
      type,
      startTime: performance.now(),
      metadata,
      children: []
    };
    
    // Create GPU query if available
    if (this.ext) {
      const query = this.isWebGL2
        ? (this.gl as WebGL2RenderingContext).createQuery()
        : this.ext.createQueryEXT();
      
      if (query) {
        this.queries.set(timer.id, query);
        
        const target = this.isWebGL2
          ? (this.ext as any).TIME_ELAPSED_EXT
          : this.ext.TIME_ELAPSED_EXT;
        
        if (this.isWebGL2) {
          (this.gl as WebGL2RenderingContext).beginQuery(target, query);
        } else {
          this.ext.beginQueryEXT(target, query);
        }
      }
    }
    
    // Add to current timer's children if nested
    if (this.timerStack.length > 0) {
      const parent = this.timerStack[this.timerStack.length - 1];
      parent.children!.push(timer);
    } else {
      this.frameTimeline.push(timer);
    }
    
    this.timerStack.push(timer);
    this.activeTimers.push(timer);
  }
  
  /**
   * End the current timing section
   */
  end(): void {
    if (!this.enabled || this.timerStack.length === 0) return;
    
    const timer = this.timerStack.pop()!;
    timer.endTime = performance.now();
    timer.cpuTime = timer.endTime - timer.startTime;
    
    // End GPU query
    if (this.ext) {
      const target = this.isWebGL2
        ? (this.ext as any).TIME_ELAPSED_EXT
        : this.ext.TIME_ELAPSED_EXT;
      
      if (this.isWebGL2) {
        (this.gl as WebGL2RenderingContext).endQuery(target);
      } else {
        this.ext.endQueryEXT(target);
      }
    }
  }
  
  /**
   * Time a specific draw call
   */
  timeDrawCall(
    drawCallFn: () => void,
    info: DrawCallInfo
  ): void {
    if (!this.enabled) {
      drawCallFn();
      return;
    }
    
    const label = `Draw_${this.drawCallIndex++}_${info.primitiveMode}`;
    
    this.begin(label, 'draw', {
      ...info,
      drawCallIndex: this.drawCallIndex - 1
    });
    
    drawCallFn();
    
    this.end();
  }
  
  /**
   * Mark the beginning of a render pass
   */
  beginPass(passName: string, metadata?: any): void {
    this.begin(passName, 'pass', metadata);
  }
  
  /**
   * Mark the end of a render pass
   */
  endPass(): void {
    this.end();
  }
  
  /**
   * Poll completed queries and update timings
   */
  poll(): void {
    if (!this.enabled || !this.ext) return;
    
    const completed: TimerQuery[] = [];
    
    for (const timer of this.activeTimers) {
      const query = this.queries.get(timer.id);
      if (!query) continue;
      
      const resultAvailable = this.isWebGL2
        ? (this.gl as WebGL2RenderingContext).getQueryParameter(
            query,
            (this.gl as WebGL2RenderingContext).QUERY_RESULT_AVAILABLE
          )
        : this.ext.getQueryObjectEXT(
            query,
            this.ext.QUERY_RESULT_AVAILABLE_EXT
          );
      
      if (resultAvailable) {
        const gpuTime = this.isWebGL2
          ? (this.gl as WebGL2RenderingContext).getQueryParameter(
              query,
              (this.gl as WebGL2RenderingContext).QUERY_RESULT
            )
          : this.ext.getQueryObjectEXT(
              query,
              this.ext.QUERY_RESULT_EXT
            );
        
        timer.gpuTime = gpuTime / 1000000; // Convert to milliseconds
        completed.push(timer);
        
        // Update stats
        this.updateStats(timer.label, timer.gpuTime);
        
        // Clean up
        if (this.isWebGL2) {
          (this.gl as WebGL2RenderingContext).deleteQuery(query);
        } else {
          this.ext.deleteQueryEXT(query);
        }
        this.queries.delete(timer.id);
      }
    }
    
    // Remove completed timers from active list
    this.activeTimers = this.activeTimers.filter(t => !completed.includes(t));
    this.completedTimers.push(...completed);
  }
  
  /**
   * Get the current frame timeline
   */
  getFrameTimeline(): TimerQuery[] {
    return this.frameTimeline;
  }
  
  /**
   * Get statistics for a specific label
   */
  getStats(label: string): TimerStats | null {
    const samples = this.stats.get(label);
    if (!samples || samples.length === 0) return null;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      last: samples[samples.length - 1],
      samples: samples.length
    };
  }
  
  /**
   * Get all statistics
   */
  getAllStats(): Map<string, TimerStats> {
    const allStats = new Map<string, TimerStats>();
    
    for (const [label, samples] of this.stats) {
      const stat = this.getStats(label);
      if (stat) allStats.set(label, stat);
    }
    
    return allStats;
  }
  
  /**
   * Reset frame timeline (call at beginning of frame)
   */
  resetFrame(): void {
    this.frameTimeline = [];
    this.drawCallIndex = 0;
  }
  
  /**
   * Get a summary of the most expensive operations
   */
  getBottlenecks(topN = 10): Array<{ label: string; time: number; type: string }> {
    const allTimers: TimerQuery[] = [];
    
    const collectTimers = (timers: TimerQuery[]) => {
      for (const timer of timers) {
        if (timer.gpuTime !== undefined) {
          allTimers.push(timer);
        }
        if (timer.children) {
          collectTimers(timer.children);
        }
      }
    };
    
    collectTimers(this.frameTimeline);
    
    return allTimers
      .sort((a, b) => (b.gpuTime || 0) - (a.gpuTime || 0))
      .slice(0, topN)
      .map(t => ({
        label: t.label,
        time: t.gpuTime || 0,
        type: t.type
      }));
  }
  
  /**
   * Export timeline data for external analysis
   */
  exportTimeline(): string {
    return JSON.stringify({
      timeline: this.frameTimeline,
      stats: Object.fromEntries(
        Array.from(this.getAllStats().entries()).map(([k, v]) => [k, v])
      ),
      metadata: {
        timestamp: Date.now(),
        frameCount: this.completedTimers.length,
        gpuTimerSupport: this.enabled
      }
    }, null, 2);
  }
  
  /**
   * Enable/disable timing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && this.ext !== null;
  }
  
  /**
   * Check if GPU timing is supported
   */
  isSupported(): boolean {
    return this.ext !== null;
  }
  
  private updateStats(label: string, time: number): void {
    if (!this.stats.has(label)) {
      this.stats.set(label, []);
    }
    
    const samples = this.stats.get(label)!;
    samples.push(time);
    
    // Keep last 60 samples
    if (samples.length > 60) {
      samples.shift();
    }
  }
}