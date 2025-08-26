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