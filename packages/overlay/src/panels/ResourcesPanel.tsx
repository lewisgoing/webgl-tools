import React from 'react';
import type { WebGLDebugger } from '@webgltools/core';

export interface ResourcesPanelProps {
  debugger: WebGLDebugger;
}

export function ResourcesPanel({ debugger: dbg }: ResourcesPanelProps) {
  const resources = dbg.getResources();
  
  return (
    <div>
      <div style={rowStyle}>
        <span>Est. Memory</span>
        <span>{formatBytes(resources.estBytes)}</span>
      </div>
      <hr style={dividerStyle} />
      <div style={rowStyle}>
        <span>Textures</span>
        <span>{resources.byKind.texture}</span>
      </div>
      <div style={rowStyle}>
        <span>Buffers</span>
        <span>{resources.byKind.buffer}</span>
      </div>
      <div style={rowStyle}>
        <span>Programs</span>
        <span>{resources.byKind.program}</span>
      </div>
      <div style={rowStyle}>
        <span>Shaders</span>
        <span>{resources.byKind.shader}</span>
      </div>
      <div style={rowStyle}>
        <span>Framebuffers</span>
        <span>{resources.byKind.framebuffer}</span>
      </div>
      <div style={rowStyle}>
        <span>Renderbuffers</span>
        <span>{resources.byKind.renderbuffer}</span>
      </div>
      <div style={rowStyle}>
        <span>VAOs</span>
        <span>{resources.byKind.vao}</span>
      </div>
      <hr style={dividerStyle} />
      <div style={rowStyle}>
        <span>Total Objects</span>
        <span>{resources.list.length}</span>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const dividerStyle: React.CSSProperties = {
  margin: '8px 0',
  border: 'none',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
};

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}