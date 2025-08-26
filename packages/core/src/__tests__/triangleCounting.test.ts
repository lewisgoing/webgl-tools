import { estimatePrims } from '../instrument';

describe('Triangle Counting', () => {
  describe('estimatePrims', () => {
    test('TRIANGLES mode counts correctly', () => {
      const result = estimatePrims(0x0004, 12);
      expect(result.tris).toBe(4); // 12 / 3 = 4
      expect(result.lines).toBe(0);
      expect(result.points).toBe(0);
    });

    test('TRIANGLES mode handles non-multiple of 3', () => {
      const result = estimatePrims(0x0004, 10);
      expect(result.tris).toBe(3); // Math.floor(10 / 3) = 3
    });

    test('TRIANGLES mode handles count < 3', () => {
      const result = estimatePrims(0x0004, 2);
      expect(result.tris).toBe(0); // Not enough vertices
    });

    test('TRIANGLE_STRIP mode counts correctly', () => {
      const result = estimatePrims(0x0005, 5);
      expect(result.tris).toBe(3); // 5 - 2 = 3
    });

    test('TRIANGLE_STRIP mode handles count < 3', () => {
      const result = estimatePrims(0x0005, 2);
      expect(result.tris).toBe(0); // Not enough vertices
    });

    test('TRIANGLE_FAN mode counts correctly', () => {
      const result = estimatePrims(0x0006, 6);
      expect(result.tris).toBe(4); // 6 - 2 = 4
    });

    test('LINES mode counts correctly', () => {
      const result = estimatePrims(0x0001, 8);
      expect(result.tris).toBe(0);
      expect(result.lines).toBe(4); // 8 / 2 = 4
      expect(result.points).toBe(0);
    });

    test('LINE_STRIP mode counts correctly', () => {
      const result = estimatePrims(0x0003, 5);
      expect(result.lines).toBe(4); // 5 - 1 = 4
    });

    test('LINE_LOOP mode counts correctly', () => {
      const result = estimatePrims(0x0002, 5);
      expect(result.lines).toBe(5); // Same as vertex count for loops
    });

    test('POINTS mode counts correctly', () => {
      const result = estimatePrims(0x0000, 10);
      expect(result.tris).toBe(0);
      expect(result.lines).toBe(0);
      expect(result.points).toBe(10);
    });

    test('Unknown mode returns zeros', () => {
      const result = estimatePrims(0x9999, 100);
      expect(result.tris).toBe(0);
      expect(result.lines).toBe(0);
      expect(result.points).toBe(0);
    });

    test('Negative count returns zeros', () => {
      const result = estimatePrims(0x0004, -5);
      expect(result.tris).toBe(0);
      expect(result.lines).toBe(0);
      expect(result.points).toBe(0);
    });

    test('Zero count returns zeros', () => {
      const result = estimatePrims(0x0004, 0);
      expect(result.tris).toBe(0);
      expect(result.lines).toBe(0);
      expect(result.points).toBe(0);
    });
  });

  describe('Real world scenarios', () => {
    test('Box geometry (12 triangles)', () => {
      // A box has 6 faces * 2 triangles each = 12 triangles
      // This requires 36 vertices when not using indices
      const result = estimatePrims(0x0004, 36);
      expect(result.tris).toBe(12);
    });

    test('Sphere with triangle strips', () => {
      // A sphere might use triangle strips for efficiency
      // With 20 vertices in a strip, we get 18 triangles
      const result = estimatePrims(0x0005, 20);
      expect(result.tris).toBe(18);
    });

    test('Grid of 100 cubes', () => {
      // 100 cubes * 12 triangles each = 1200 triangles
      // Each cube draws separately, so 36 vertices per draw call
      let totalTriangles = 0;
      for (let i = 0; i < 100; i++) {
        const result = estimatePrims(0x0004, 36);
        totalTriangles += result.tris;
      }
      expect(totalTriangles).toBe(1200);
    });
  });
});