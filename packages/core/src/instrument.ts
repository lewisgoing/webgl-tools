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

  // Track buffer uploads
  const _bufferData = gl.bufferData.bind(gl);
  gl.bufferData = function(target: number, sizeOrData: any, usage: number) {
    counters.bufferUploads++;
    return _bufferData(target, sizeOrData, usage);
  };

  const _bufferSubData = gl.bufferSubData.bind(gl);
  gl.bufferSubData = function(target: number, offset: number, data: any) {
    counters.bufferUploads++;
    return _bufferSubData(target, offset, data);
  };

  return gl;
}