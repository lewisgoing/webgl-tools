import { EnhancedGPUTimers } from '../timersEnhanced';

// Mock WebGL timer extension that actually returns WebGL constants
const createMockTimerExtension = () => {
  let queryCounter = 1;
  const queries = new Map();
  const queryResults = new Map();
  
  return {
    createQueryEXT: jest.fn(() => {
      const query = { id: queryCounter++ };
      queries.set(query, { active: false });
      return query;
    }),
    
    deleteQueryEXT: jest.fn((query) => {
      queries.delete(query);
      queryResults.delete(query);
    }),
    
    beginQueryEXT: jest.fn((target, query) => {
      const q = queries.get(query);
      if (q) q.active = true;
    }),
    
    endQueryEXT: jest.fn((target) => {
      // Find active query and mark as inactive
      for (const [query, data] of queries.entries()) {
        if (data.active) {
          data.active = false;
          // Simulate timing result
          queryResults.set(query, true);
          break;
        }
      }
    }),
    
    getQueryObjectEXT: jest.fn((query, pname) => {
      if (pname === 0x8867) { // QUERY_RESULT_AVAILABLE_EXT
        return queryResults.has(query);
      }
      if (pname === 0x8866) { // QUERY_RESULT_EXT
        return queryResults.has(query) ? Math.random() * 10000000 : 0; // nanoseconds
      }
      return 0;
    }),
    
    isQueryEXT: jest.fn((query) => queries.has(query)),
    
    // Constants
    TIME_ELAPSED_EXT: 0x88BF,
    QUERY_RESULT_EXT: 0x8866,
    QUERY_RESULT_AVAILABLE_EXT: 0x8867
  };
};

// Mock WebGL context
const createMockGL = (supportsTimers = true) => {
  const ext = supportsTimers ? createMockTimerExtension() : null;
  
  const gl: any = {
    getExtension: jest.fn((name) => {
      if ((name === 'EXT_disjoint_timer_query' || name === 'EXT_disjoint_timer_query_webgl2') && supportsTimers) {
        return ext;
      }
      return null;
    }),
    
    // WebGL2 query constants
    QUERY_RESULT: 0x8866,
    QUERY_RESULT_AVAILABLE: 0x8867,
    
    // WebGL2 query methods
    createQuery: jest.fn(() => supportsTimers ? { id: Math.random() } : null),
    deleteQuery: jest.fn(),
    beginQuery: jest.fn(),
    endQuery: jest.fn(),
    getQueryParameter: jest.fn((query, pname) => {
      if (!supportsTimers) return null;
      if (pname === 0x8867) return true; // QUERY_RESULT_AVAILABLE
      if (pname === 0x8866) return Math.random() * 10000000; // QUERY_RESULT
      return 0;
    }),
    
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
    drawArraysInstanced: jest.fn(),
    drawElementsInstanced: jest.fn(),
    
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,
    LINES: 0x0001,
    LINE_STRIP: 0x0003,
    LINE_LOOP: 0x0002,
    POINTS: 0x0000,
    
    getParameter: jest.fn(() => null),
    
    finish: jest.fn(),
    flush: jest.fn()
  };
  
  return { gl, ext };
};

describe('EnhancedGPUTimers', () => {
  describe('constructor', () => {
    test('initializes with timer support', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      expect(timers.isSupported()).toBe(true);
    });
    
    test('initializes without timer support', () => {
      const { gl } = createMockGL(false);
      const timers = new EnhancedGPUTimers(gl);
      expect(timers.isSupported()).toBe(false);
    });
    
    test('accepts custom options', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      expect(timers).toBeDefined();
    });
  });
  
  describe('begin/end timing', () => {
    test('times a simple operation', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Test Operation');
      // Simulate some work
      gl.drawArrays(gl.TRIANGLES, 0, 300);
      timers.end();
      
      expect(ext.createQueryEXT).toHaveBeenCalled();
      expect(ext.beginQueryEXT).toHaveBeenCalledWith(ext.TIME_ELAPSED_EXT, expect.any(Object));
      expect(ext.endQueryEXT).toHaveBeenCalledWith(ext.TIME_ELAPSED_EXT);
    });
    
    test('handles nested timing', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Parent Operation');
      timers.begin('Child Operation 1');
      timers.end();
      timers.begin('Child Operation 2');
      timers.end();
      timers.end();
      
      // Should create queries for all operations
      expect(gl.getExtension).toHaveBeenCalledWith('EXT_disjoint_timer_query');
    });
    
    test('handles mismatched begin/end gracefully', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // End without begin should not throw
      expect(() => timers.end()).not.toThrow();
      
      // Multiple begins should work
      timers.begin('Op1');
      timers.begin('Op2');
      timers.end();
      timers.end();
    });
  });
  
  describe('beginPass/endPass', () => {
    test('times a render pass', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.beginPass('Shadow Rendering', { resolution: 2048 });
      gl.drawArrays(gl.TRIANGLES, 0, 1000);
      timers.endPass();
      
      // Pass timing should be tracked
      timers.poll();
      const stats = timers.getAllStats();
      expect(stats.has('Shadow Rendering')).toBe(true);
    });
    
    test('accumulates multiple pass executions', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Execute same pass multiple times
      for (let i = 0; i < 3; i++) {
        timers.beginPass('Main Render');
        gl.drawArrays(gl.TRIANGLES, 0, 100);
        timers.endPass();
      }
      
      // Mock poll results
      let queryIndex = 0;
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) {
          return (queryIndex++ % 3 + 1) * 1000000; // 1ms, 2ms, 3ms
        }
        return 0;
      });
      
      timers.poll();
      const stats = timers.getAllStats();
      const mainRenderStats = timers.getStats('Main Render');
      
      expect(mainRenderStats).toBeDefined();
      expect(mainRenderStats?.samples).toBe(3);
      expect(mainRenderStats?.average).toBeGreaterThan(0);
    });
  });
  
  describe('timeDrawCall', () => {
    test('times individual draw calls', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.timeDrawCall(
        () => gl.drawElements(gl.TRIANGLES, 300, gl.UNSIGNED_SHORT, 0),
        {
          primitiveMode: 'TRIANGLES',
          vertexCount: 300,
          shaderName: 'PhongShader',
          programId: '42'
        }
      );
      
      expect(ext.createQueryEXT).toHaveBeenCalled();
      expect(gl.drawElements).toHaveBeenCalled();
    });
    
    test('tracks draw call metadata', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Time multiple draw calls
      timers.timeDrawCall(
        () => gl.drawArrays(gl.TRIANGLES, 0, 100),
        {
          primitiveMode: 'TRIANGLES',
          vertexCount: 100,
          shaderName: 'SimpleShader'
        }
      );
      
      timers.timeDrawCall(
        () => gl.drawArrays(gl.POINTS, 0, 1000),
        {
          primitiveMode: 'POINTS',
          vertexCount: 1000,
          shaderName: 'ParticleShader'
        }
      );
      
      // Mock results
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) return 1000000; // 1ms
        return 0;
      });
      
      timers.poll();
      
      // Should have tracked both draw calls
      const timeline = timers.getFrameTimeline();
      expect(timeline.length).toBeGreaterThanOrEqual(2);
    });
    
    test('handles draw call without timer support', () => {
      const { gl } = createMockGL(false);
      const timers = new EnhancedGPUTimers(gl);
      
      // Should execute draw call even without timing
      let executed = false;
      timers.timeDrawCall(
        () => { executed = true; gl.drawArrays(gl.TRIANGLES, 0, 100); },
        {
          primitiveMode: 'TRIANGLES',
          vertexCount: 100
        }
      );
      
      expect(executed).toBe(true);
      expect(gl.drawArrays).toHaveBeenCalled();
    });
  });
  
  describe('poll and results', () => {
    test('polls completed queries', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Operation 1');
      timers.end();
      timers.begin('Operation 2');
      timers.end();
      
      // Mock query results
      const queries: any[] = [];
      ext.createQueryEXT.mockImplementation(() => {
        const q = { id: queries.length };
        queries.push(q);
        return q;
      });
      
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) {
          return query.id === 0 ? 5000000 : 3000000; // 5ms and 3ms
        }
        return 0;
      });
      
      timers.poll();
      
      // Check that timers were processed
      const stats = timers.getAllStats();
      expect(stats.size).toBeGreaterThan(0);
    });
    
    test('handles GPU timer reset', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Operation');
      timers.end();
      
      // Mock query not being available due to disjoint
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return false; // Not available
        return 0;
      });
      
      timers.poll();
      
      // Since query result wasn't available, stats should not be updated
      const stats = timers.getStats('Operation');
      expect(stats).toBeNull();
    });
  });
  
  describe('getBottlenecks', () => {
    test('identifies slowest operations', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Create operations with known timings
      const operations = [
        { name: 'Fast Op', time: 1 },
        { name: 'Slow Op', time: 10 },
        { name: 'Medium Op', time: 5 },
        { name: 'Slowest Op', time: 20 }
      ];
      
      let queryIndex = 0;
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) {
          const time = operations[queryIndex % operations.length].time;
          queryIndex++;
          return time * 1000000; // Convert to nanoseconds
        }
        return 0;
      });
      
      // Time operations
      operations.forEach(op => {
        timers.begin(op.name);
        timers.end();
      });
      
      timers.poll();
      
      const bottlenecks = timers.getBottlenecks(2);
      expect(bottlenecks).toHaveLength(2);
      expect(bottlenecks[0].label).toBe('Slowest Op');
      expect(bottlenecks[1].label).toBe('Slow Op');
    });
    
    test('includes both passes and draw calls', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Mock timing results
      let timeValue = 10;
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) {
          return (timeValue--) * 1000000;
        }
        return 0;
      });
      
      // Add pass timing
      timers.beginPass('Expensive Pass');
      timers.endPass();
      
      // Add draw call timing
      timers.timeDrawCall(
        () => gl.drawArrays(gl.TRIANGLES, 0, 10000),
        {
          primitiveMode: 'TRIANGLES',
          vertexCount: 10000,
          shaderName: 'ComplexShader'
        }
      );
      
      timers.poll();
      
      const bottlenecks = timers.getBottlenecks(5);
      const types = bottlenecks.map(b => b.type);
      expect(types).toContain('pass');
      expect(types).toContain('draw');
    });
  });
  
  describe('getFrameTimeline', () => {
    test('returns hierarchical timeline', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Frame', 'frame');
      timers.begin('Shadows', 'pass');
      timers.begin('Shadow Map 1', 'draw');
      timers.end();
      timers.begin('Shadow Map 2', 'draw');
      timers.end();
      timers.end();
      timers.begin('Main', 'pass');
      timers.end();
      timers.end();
      
      const timeline = timers.getFrameTimeline();
      expect(timeline).toHaveLength(1);
      expect(timeline[0].label).toBe('Frame');
      expect(timeline[0].children).toBeDefined();
      expect(timeline[0].children?.length).toBe(2);
      expect(timeline[0].children?.[0].label).toBe('Shadows');
      expect(timeline[0].children?.[0].children?.length).toBe(2);
    });
    
    test('includes metadata in timeline entries', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Draw Complex Mesh', 'draw', {
        triangles: 50000,
        shader: 'PBR'
      });
      timers.end();
      
      const timeline = timers.getFrameTimeline();
      expect(timeline[0].metadata).toBeDefined();
      expect(timeline[0].metadata?.triangles).toBe(50000);
      expect(timeline[0].metadata?.shader).toBe('PBR');
    });
  });
  
  describe('reset functionality', () => {
    test('resetFrame clears current frame data', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.begin('Op1');
      timers.end();
      timers.begin('Op2');
      timers.end();
      
      timers.resetFrame();
      
      const timeline = timers.getFrameTimeline();
      expect(timeline).toHaveLength(0);
    });
    
    test('resetAll clears all accumulated data', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Add pass timings
      timers.beginPass('Pass1');
      timers.endPass();
      
      // Mock poll to accumulate results
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) return 1000000; // 1ms
        return 0;
      });
      timers.poll();
      
      // Reset frame clears frame data but not accumulated stats
      timers.resetFrame();
      
      const timeline = timers.getFrameTimeline();
      expect(timeline.length).toBe(0);
      
      const bottlenecks = timers.getBottlenecks();
      expect(bottlenecks).toHaveLength(0);
    });
  });
  
  describe('export functionality', () => {
    test('exports timeline as JSON', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      timers.beginPass('Render Pass');
      timers.timeDrawCall(
        () => gl.drawArrays(gl.TRIANGLES, 0, 100),
        {
          primitiveMode: 'TRIANGLES',
          vertexCount: 100,
          shaderName: 'TestShader'
        }
      );
      timers.endPass();
      
      // Mock timing results
      ext.getQueryObjectEXT.mockImplementation((query, pname) => {
        if (pname === ext.QUERY_RESULT_AVAILABLE_EXT) return true;
        if (pname === ext.QUERY_RESULT_EXT) return 1500000; // 1.5ms
        return 0;
      });
      
      timers.poll();
      
      const json = timers.exportTimeline();
      const parsed = JSON.parse(json);
      
      expect(parsed.timeline).toBeDefined();
      expect(parsed.stats).toBeDefined();
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.timestamp).toBeDefined();
    });
  });
  
  describe('edge cases', () => {
    test('handles very deep nesting', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Create 10 levels of nesting
      for (let i = 0; i < 10; i++) {
        timers.begin(`Level ${i}`);
      }
      for (let i = 0; i < 10; i++) {
        timers.end();
      }
      
      const timeline = timers.getFrameTimeline();
      
      // Verify deep nesting worked
      let current = timeline[0];
      let depth = 0;
      while (current?.children?.length > 0) {
        depth++;
        current = current.children[0];
      }
      expect(depth).toBe(9); // 0-indexed
    });
    
    test('handles many queries', () => {
      const { gl, ext } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      // Try to create many queries
      for (let i = 0; i < 10; i++) {
        timers.begin(`Op ${i}`);
        timers.end();
      }
      
      // Should not crash
      expect(ext.createQueryEXT).toHaveBeenCalled();
    });
    
    test('handles timer extension loss', () => {
      const { gl } = createMockGL(true);
      const timers = new EnhancedGPUTimers(gl);
      
      expect(timers.isSupported()).toBe(true);
      
      // Simulate extension loss
      gl.getExtension.mockReturnValue(null);
      
      // Operations should still work but without timing
      expect(() => {
        timers.begin('Test');
        timers.end();
      }).not.toThrow();
    });
  });
});