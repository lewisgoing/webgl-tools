import { WebGLDebugger } from '@webgltools/core';

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
import('@webgltools/overlay').then(({ mountOverlay }) => mountOverlay(dbg));