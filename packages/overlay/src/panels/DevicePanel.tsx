import React from 'react';
import type { WebGLDebugger } from '@webgltools/core';

export interface DevicePanelProps {
  debugger: WebGLDebugger;
}

export function DevicePanel({ debugger: dbg }: DevicePanelProps) {
  const caps = dbg.caps;
  
  return (
    <div>
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Version</div>
        <div>{caps.webgl2 ? 'WebGL 2.0' : 'WebGL 1.0'}</div>
      </div>
      
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Extensions</div>
        <div style={rowStyle}>
          <span>Instanced</span>
          <span>{caps.ext.instanced ? '✓' : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>VAO</span>
          <span>{caps.ext.vao ? '✓' : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>MRT</span>
          <span>{caps.ext.mrt ? '✓' : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>Timer</span>
          <span>{caps.ext.timer !== 'none' ? `✓ (${caps.ext.timer})` : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>Depth Texture</span>
          <span>{caps.ext.depthTexture ? '✓' : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>Float Color Buffer</span>
          <span>{caps.ext.colorBufferFloat ? '✓' : '✗'}</span>
        </div>
        <div style={rowStyle}>
          <span>Half Float Color</span>
          <span>{caps.ext.colorBufferHalfFloat ? '✓' : '✗'}</span>
        </div>
      </div>

      <button 
        style={exportButtonStyle}
        onClick={() => {
          const data = dbg.exportSession();
          navigator.clipboard.writeText(data);
        }}
      >
        Copy Session JSON
      </button>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 'bold',
  marginBottom: 8,
  color: '#4a9eff',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 2,
};

const exportButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  marginTop: 12,
  border: 'none',
  borderRadius: 4,
  backgroundColor: '#4a9eff',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'monospace',
};