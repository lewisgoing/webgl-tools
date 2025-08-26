import React from 'react';
import type { WebGLDebugger } from '@webgl-tools/core';

export interface FBOInspectorPanelProps {
  debugger: WebGLDebugger;
}

export function FBOInspectorPanel({ debugger: dbg }: FBOInspectorPanelProps) {
  // Placeholder - would integrate with FBO debugging
  return (
    <div style={{ color: '#888' }}>
      FBO Inspector coming soon
    </div>
  );
}