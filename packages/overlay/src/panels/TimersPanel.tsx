import React from 'react';
import type { WebGLDebugger } from '@webgl-tools/core';

export interface TimersPanelProps {
  debugger: WebGLDebugger;
}

export function TimersPanel({ debugger: dbg }: TimersPanelProps) {
  const timers = dbg.getTimers();
  const entries = Object.entries(timers).filter(([k]) => !k.startsWith('__'));
  
  if (entries.length === 0) {
    return (
      <div style={{ color: '#888' }}>
        {dbg.caps.ext.timer === 'none' 
          ? 'GPU timers not available on this device'
          : 'No custom timers. Use dbg.timers.begin/end()'}
      </div>
    );
  }
  
  return (
    <div>
      {entries.map(([name, stats]) => (
        <div key={name} style={timerBlockStyle}>
          <div style={timerNameStyle}>{name}</div>
          <div style={rowStyle}>
            <span>Last</span>
            <span>{stats.last?.toFixed(2) ?? '-'} ms</span>
          </div>
          <div style={rowStyle}>
            <span>Avg</span>
            <span>{stats.avg.toFixed(2)} ms</span>
          </div>
          <div style={rowStyle}>
            <span>P95</span>
            <span style={stats.p95 > 16 ? warningStyle : {}}>
              {stats.p95.toFixed(2)} ms
            </span>
          </div>
          <div style={rowStyle}>
            <span>Max</span>
            <span style={stats.max > 16 ? warningStyle : {}}>
              {stats.max.toFixed(2)} ms
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const timerBlockStyle: React.CSSProperties = {
  marginBottom: 12,
};

const timerNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#4a9eff',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 2,
};

const warningStyle: React.CSSProperties = {
  color: '#ff6b6b',
};