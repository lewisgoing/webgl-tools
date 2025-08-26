# WebGL Tools Comprehensive Test Plan

## Overview
This document outlines a comprehensive testing strategy to ensure all features of the WebGL debugging toolkit work correctly and provide accurate metrics.

## Critical Issues Identified
1. **Triangle counting inconsistency**: Triangle count decreases when object count increases from 500 to 1000
2. **Memory tracking shows 0 B**: Memory estimates are not being calculated
3. **Shader count stays at 0**: Shaders are not being tracked properly
4. **Context wrapping timing**: Three.js may be caching GL methods before our wrappers are installed

## Testing Strategy

### 1. Unit Tests (packages/core/src/__tests__)
Test individual functions in isolation to ensure correctness.

#### Triangle Counting Tests (`triangleCounting.test.ts`)
- Test `estimatePrims()` function for all primitive types:
  - `gl.TRIANGLES`: Verify count/3 calculation
  - `gl.TRIANGLE_STRIP`: Verify count-2 calculation
  - `gl.TRIANGLE_FAN`: Verify count-2 calculation
  - `gl.LINES`, `gl.LINE_STRIP`, `gl.LINE_LOOP`: Verify line counting
  - `gl.POINTS`: Verify point counting
- Test edge cases: count < 3 for strips/fans, negative counts, zero counts

#### Memory Tracking Tests (`memoryTracking.test.ts`)
- Test buffer memory calculation:
  - `bufferData` with size parameter
  - `bufferData` with ArrayBuffer
  - `bufferData` with TypedArray
- Test texture memory calculation:
  - Various format/type combinations
  - Mipmaps and texture levels
  - Compressed textures
- Test memory accumulation and getter functionality

#### Resource Tracking Tests (`resourceTracking.test.ts`)
- Test resource creation/deletion tracking
- Test WeakMap functionality for resource associations
- Test resource counting by type
- Test memory association with resources

### 2. Integration Tests (packages/core/src/__tests__/integration/)
Test how components work together.

#### Context Wrapping Tests (`contextWrapping.test.ts`)
- Create mock WebGL context
- Test that all methods are properly wrapped
- Test that wrapped methods are called with correct arguments
- Test that original functionality is preserved
- Test extension method wrapping (instanced arrays, VAOs)

#### Three.js Integration Tests (`threeIntegration.test.ts`)
- Test creating context before Three.js
- Test that Three.js uses wrapped methods
- Test accurate tracking with Three.js scenes
- Test resource disposal tracking

### 3. E2E Tests with Playwright (e2e/)
Test the complete system in a real browser environment.

#### Playground Tests (`playground.test.ts`)
- Test each scene type:
  - Basic scene: Verify triangle count = objectCount * trianglesPerCube
  - Stress test: Verify consistent metrics
  - Instancing: Verify instanced draw calls are counted correctly
  - Resource leak: Verify memory increases over time
- Test UI controls:
  - Object count slider changes metrics appropriately
  - Debug mode switches work
  - Overlay updates in real-time
- Test metric accuracy:
  - Draw calls match expected values
  - Triangle counts are mathematically correct
  - Memory estimates increase when resources are created
  - FPS calculation is reasonable

#### Cross-browser Tests
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### 4. Performance Tests
- Measure overhead of instrumentation
- Ensure "sampled" mode has minimal impact
- Test with large scenes (10k+ objects)

## Test Data Validation

### Expected Values for Basic Scene
```
Object Count: 100
Expected Triangles: 100 * 12 = 1,200 (box has 12 triangles)
Expected Draw Calls: 100 (one per mesh)
Expected Programs: 1 (shared material)
Expected Geometries: 1 (shared geometry)
Expected Materials: 100 (unique colors)
```

### Memory Calculation Verification
```
BoxGeometry (1x1x1):
- Vertices: 24 (8 corners * 3 attributes)
- Position: 24 * 3 * 4 bytes = 288 bytes
- Normal: 24 * 3 * 4 bytes = 288 bytes
- UV: 24 * 2 * 4 bytes = 192 bytes
- Index: 36 * 2 bytes = 72 bytes
- Total per geometry: ~840 bytes

Texture (if any):
- RGBA 512x512: 512 * 512 * 4 = 1,048,576 bytes (1 MB)
```

## Implementation Steps

1. **Fix Core Issues First**
   - Fix triangle counting logic
   - Fix memory tracking getter
   - Ensure context wrapping happens before Three.js

2. **Implement Test Infrastructure**
   - Set up Jest for unit/integration tests
   - Set up Playwright for E2E tests
   - Create test utilities and mocks

3. **Write and Run Tests**
   - Start with unit tests
   - Move to integration tests
   - Finish with E2E tests

4. **Fix Discovered Issues**
   - Document each issue found
   - Fix in implementation
   - Add regression tests

5. **Validate Accuracy**
   - Compare with known-good tools (Spector.js)
   - Manual verification with simple test cases
   - Performance profiling

## Success Criteria
- All tests pass consistently
- Metrics match mathematical expectations
- No memory leaks in the toolkit itself
- Performance overhead < 5% in sampled mode
- Works correctly across all major browsers
- Real-time updates work without tab switching