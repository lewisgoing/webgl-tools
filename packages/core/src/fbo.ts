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