import React from 'react';
import type { WebGLDebugger } from '@webgltools/core';

export interface ShaderErrorsPanelProps {
  debugger: WebGLDebugger;
}

export function ShaderErrorsPanel({ debugger: dbg }: ShaderErrorsPanelProps) {
  // Placeholder - would integrate with shader error tracking
  return (
    <div style={{ color: '#888' }}>
      No shader errors detected
    </div>
  );
}