import React from 'react';
import type { WebGLDebugger } from '@webgltools/core';

export interface StatsPanelProps {
  debugger: WebGLDebugger;
}

export function StatsPanel({ debugger: dbg }: StatsPanelProps) {
  const snapshot = dbg.getSnapshot();
  
  return (
    <div>
      <div style={rowStyle}>
        <span>FPS</span>
        <span>{snapshot.fps.toFixed(1)}</span>
      </div>
      <div style={rowStyle}>
        <span>CPU</span>
        <span>{snapshot.cpuMs.toFixed(1)} ms</span>
      </div>
      {snapshot.gpuMs && (
        <div style={rowStyle}>
          <span>GPU</span>
          <span>{snapshot.gpuMs.toFixed(1)} ms</span>
        </div>
      )}
      <hr style={dividerStyle} />
      <div style={rowStyle}>
        <span>Draw Calls</span>
        <span>{snapshot.drawCalls}</span>
      </div>
      <div style={rowStyle}>
        <span>Instanced</span>
        <span>{snapshot.instancedDrawCalls}</span>
      </div>
      <div style={rowStyle}>
        <span>Triangles</span>
        <span>{formatNumber(snapshot.triangles)}</span>
      </div>
      <div style={rowStyle}>
        <span>Points</span>
        <span>{formatNumber(snapshot.points)}</span>
      </div>
      <div style={rowStyle}>
        <span>Lines</span>
        <span>{formatNumber(snapshot.lines)}</span>
      </div>
      <hr style={dividerStyle} />
      <div style={rowStyle}>
        <span>Texture Binds</span>
        <span>{snapshot.textureBinds}</span>
      </div>
      <div style={rowStyle}>
        <span>Shader Switches</span>
        <span>{snapshot.shaderSwitches}</span>
      </div>
      <div style={rowStyle}>
        <span>Buffer Uploads</span>
        <span>{snapshot.bufferUploads}</span>
      </div>
      {snapshot.postPasses > 0 && (
        <div style={rowStyle}>
          <span>Post Passes</span>
          <span>{snapshot.postPasses}</span>
        </div>
      )}
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

function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}