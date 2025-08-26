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