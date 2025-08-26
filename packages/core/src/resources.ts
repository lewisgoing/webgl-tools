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