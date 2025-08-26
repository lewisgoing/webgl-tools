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