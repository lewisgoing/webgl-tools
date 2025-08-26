import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';
import type { WebGLDebugger } from '@webgltools/core';

export function mountOverlay(dbg: WebGLDebugger, root?: HTMLElement, panels?: string[]) {
  const container = root || document.createElement('div');
  if (!root) document.body.appendChild(container);
  
  const reactRoot = createRoot(container);
  reactRoot.render(<Overlay debugger={dbg} panels={panels} />);
  
  // Patch debugger methods
  const originalMount = dbg.mountOverlay.bind(dbg);
  const originalUnmount = dbg.unmountOverlay.bind(dbg);
  
  dbg.mountOverlay = originalMount;
  dbg.unmountOverlay = () => {
    reactRoot.unmount();
    if (!root && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    originalUnmount();
  };
}

export { Overlay } from './Overlay';
export * from './panels/StatsPanel';
export * from './panels/ResourcesPanel';
export * from './panels/TimersPanel';
export * from './panels/DevicePanel';
export * from './panels/ShaderErrorsPanel';
export * from './panels/FBOInspectorPanel';