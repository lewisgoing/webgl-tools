# Architecture Overview

## Design Principles

1. **Minimal Overhead**: The toolkit is designed to have negligible performance impact, especially in production mode
2. **Safe Fallbacks**: All features gracefully degrade when WebGL extensions or capabilities are unavailable
3. **Framework Agnostic**: Core functionality works with raw WebGL, with optional adapters for popular frameworks
4. **Progressive Enhancement**: Start with basic metrics, add advanced features as needed

## Core Components

### WebGL Context Wrapping

The toolkit wraps WebGL methods to intercept and monitor API calls:

```
Application → Wrapped GL Methods → Original GL Context
                     ↓
              Metrics Collection
```

### Performance Modes

- **Off Mode**: No instrumentation, zero overhead
- **Sampled Mode**: Probabilistic sampling (default 25%) for production monitoring
- **Full Mode**: Complete instrumentation for development debugging

### Resource Tracking

Resources are tracked using WeakMap to avoid memory leaks:

```
GL Object Creation → WeakMap Registration → Lifecycle Tracking
                            ↓
                    Memory Estimation
```

## Module Structure

```
@webgl-tools/core
├── Context Wrapping (instrument.ts)
├── Capability Detection (caps.ts)
├── Resource Tracking (resources.ts)
├── GPU Timers (timers.ts)
├── Shader Tools (shaderErrors.ts)
└── Enhanced Features
    ├── ShaderErrorFormatter
    ├── FBOInspector
    ├── EnhancedGPUTimers
    └── PerformanceProfiler
```

## Data Flow

1. **Frame Lifecycle**
   ```
   beginFrame() → Reset Counters → Collect Metrics → endFrame() → Calculate FPS
   ```

2. **Draw Call Tracking**
   ```
   drawArrays/drawElements → Count Primitives → Update Statistics
   ```

3. **Resource Management**
   ```
   create* → Track Resource → estimate Memory
   delete* → Remove Resource → Update Memory
   ```

## Extension Points

### Framework Adapters

Adapters hook into framework-specific rendering pipelines:

```typescript
// Three.js Adapter
attachThreeAdapter(renderer, debugger) {
  // Hook into Three.js render loop
  // Extract accurate geometry data
}
```

### Custom Metrics

Applications can track custom metrics:

```typescript
debugger.incCustom('particleCount', 1000);
debugger.pushPass('Shadow Pass');
```

## Performance Considerations

1. **Sampling Strategy**: In sampled mode, only a subset of frames are fully instrumented
2. **Lazy Initialization**: Features are loaded on-demand to reduce initial bundle size
3. **Zero-Copy Design**: Metrics are read directly from typed arrays when possible
4. **Pooled Objects**: Timer queries and temporary objects are pooled and reused

## Browser Compatibility

- WebGL 1.0: Full support with fallbacks
- WebGL 2.0: Enhanced features when available
- Timer Queries: Automatic detection and fallback
- Module Support: ES modules with CommonJS fallback