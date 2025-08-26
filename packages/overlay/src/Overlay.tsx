import React, { useState, useEffect, useRef, memo } from 'react';
import type { WebGLDebugger } from '@webgl-tools/core';
import { StatsPanel } from './panels/StatsPanel';
import { ResourcesPanel } from './panels/ResourcesPanel';
import { TimersPanel } from './panels/TimersPanel';
import { DevicePanel } from './panels/DevicePanel';
import { ShaderErrorsPanel } from './panels/ShaderErrorsPanel';
import { FBOInspectorPanel } from './panels/FBOInspectorPanel';

export interface OverlayProps {
  debugger: WebGLDebugger;
  panels?: string[];
}

const DEFAULT_PANELS = ['stats', 'resources', 'timers'];

export const Overlay = memo(({ debugger: dbg, panels = DEFAULT_PANELS }: OverlayProps) => {
  const [activePanel, setActivePanel] = useState(panels[0]);
  const [, forceUpdate] = useState({});
  const rafRef = useRef<number>();

  // Update once per frame
  useEffect(() => {
    const update = () => {
      // Force re-render for fresh data
      forceUpdate({});
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const panelMap = {
    stats: <StatsPanel debugger={dbg} />,
    resources: <ResourcesPanel debugger={dbg} />,
    timers: <TimersPanel debugger={dbg} />,
    device: <DevicePanel debugger={dbg} />,
    errors: <ShaderErrorsPanel debugger={dbg} />,
    fbo: <FBOInspectorPanel debugger={dbg} />,
  };

  return (
    <div style={overlayStyle}>
      <div style={tabBarStyle}>
        {panels.map(p => (
          <button
            key={p}
            onClick={() => setActivePanel(p)}
            style={{...tabStyle, ...(activePanel === p ? activeTabStyle : {})}}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={panelStyle}>
        {panelMap[activePanel as keyof typeof panelMap]}
      </div>
    </div>
  );
});

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 10,
  right: 10,
  width: 320,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: 12,
  borderRadius: 4,
  overflow: 'hidden',
  zIndex: 99999,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
};

const tabStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: 'none',
  background: 'none',
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 11,
};

const activeTabStyle: React.CSSProperties = {
  color: '#fff',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
};

const panelStyle: React.CSSProperties = {
  padding: 12,
  minHeight: 200,
};