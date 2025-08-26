import { test, expect } from '@playwright/test';

test.describe('WebGL Tools Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    // Wait for the playground to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000); // Let the scene initialize
  });

  test.describe('Basic Scene Tests', () => {
    test('triangle count matches object count', async ({ page }) => {
      // Ensure we're on basic scene
      await page.selectOption('select:first-of-type', 'basic');
      await page.waitForTimeout(500);

      // Test with 100 objects
      await page.locator('input[type="range"]').fill('100');
      await page.waitForTimeout(1000);

      // Get triangle count from stats panel
      const triangleText = await page.locator('text=/Triangles/').locator('..').textContent();
      const triangleCount = parseFloat(triangleText?.match(/Triangles\s+([0-9.KM]+)/)?.[1]?.replace('K', '000').replace('M', '000000') || '0');
      
      // Each box has 12 triangles (6 faces * 2 triangles)
      expect(triangleCount).toBe(100 * 12);

      // Test with 500 objects
      await page.locator('input[type="range"]').fill('500');
      await page.waitForTimeout(1000);

      const triangleText2 = await page.locator('text=/Triangles/').locator('..').textContent();
      const triangleCount2 = parseFloat(triangleText2?.match(/Triangles\s+([0-9.KM]+)/)?.[1]?.replace('K', '000').replace('M', '000000') || '0');
      
      expect(triangleCount2).toBe(500 * 12);

      // Test with 1000 objects
      await page.locator('input[type="range"]').fill('1000');
      await page.waitForTimeout(1000);

      const triangleText3 = await page.locator('text=/Triangles/').locator('..').textContent();
      const triangleCount3 = parseFloat(triangleText3?.match(/Triangles\s+([0-9.KM]+)/)?.[1]?.replace('K', '000').replace('M', '000000') || '0');
      
      expect(triangleCount3).toBe(1000 * 12);
      
      // Ensure triangle count increases with object count
      expect(triangleCount3).toBeGreaterThan(triangleCount2);
      expect(triangleCount2).toBeGreaterThan(triangleCount);
    });

    test('draw calls match object count', async ({ page }) => {
      await page.selectOption('select:first-of-type', 'basic');
      await page.waitForTimeout(500);

      await page.locator('input[type="range"]').fill('50');
      await page.waitForTimeout(1000);

      const drawCallText = await page.locator('text=/Draw Calls/').locator('..').textContent();
      const drawCalls = parseInt(drawCallText?.match(/Draw Calls\s+(\d+)/)?.[1] || '0');
      
      // Should have one draw call per mesh
      expect(drawCalls).toBe(50);
    });
  });

  test.describe('Memory Tracking Tests', () => {
    test('memory shows non-zero values', async ({ page }) => {
      // Switch to resources tab
      await page.click('button:has-text("RESOURCES")');
      await page.waitForTimeout(500);

      const memoryText = await page.locator('text=/Est. Memory/').locator('..').textContent();
      const memory = memoryText?.match(/Est\. Memory\s+([0-9.]+ [A-Z]+)/)?.[1];
      
      // Memory should not be "0 B"
      expect(memory).not.toBe('0 B');
      
      // Create test resources to increase memory
      await page.click('button:has-text("Create Test Resources")');
      await page.waitForTimeout(1000);

      const memoryText2 = await page.locator('text=/Est. Memory/').locator('..').textContent();
      const memory2 = memoryText2?.match(/Est\. Memory\s+([0-9.]+ [A-Z]+)/)?.[1];
      
      // Memory should have increased
      expect(memory2).not.toBe('0 B');
      expect(memory2).not.toBe(memory);
    });

    test('resource counts update correctly', async ({ page }) => {
      await page.click('button:has-text("RESOURCES")');
      await page.waitForTimeout(500);

      // Get initial texture count
      const textureText = await page.locator('text=/Textures/').locator('..').textContent();
      const initialTextures = parseInt(textureText?.match(/Textures\s+(\d+)/)?.[1] || '0');

      // Create test resources
      await page.click('button:has-text("Create Test Resources")');
      await page.waitForTimeout(1000);

      const textureText2 = await page.locator('text=/Textures/').locator('..').textContent();
      const finalTextures = parseInt(textureText2?.match(/Textures\s+(\d+)/)?.[1] || '0');

      // Should have created 10 textures
      expect(finalTextures - initialTextures).toBe(10);
    });
  });

  test.describe('Scene Type Tests', () => {
    test('resource leak scene increases memory over time', async ({ page }) => {
      await page.selectOption('select:first-of-type', 'resourceleak');
      await page.click('button:has-text("RESOURCES")');
      await page.waitForTimeout(2000);

      // Get initial memory
      const memoryText1 = await page.locator('text=/Est. Memory/').locator('..').textContent();
      const parseMemory = (text: string) => {
        const match = text?.match(/Est\. Memory\s+([0-9.]+)\s*([A-Z]+)/);
        if (!match) return 0;
        let value = parseFloat(match[1]);
        if (match[2] === 'KB') value *= 1024;
        if (match[2] === 'MB') value *= 1024 * 1024;
        if (match[2] === 'GB') value *= 1024 * 1024 * 1024;
        return value;
      };
      
      const memory1 = parseMemory(memoryText1 || '');

      // Wait for more resources to be created
      await page.waitForTimeout(5000);

      const memoryText2 = await page.locator('text=/Est. Memory/').locator('..').textContent();
      const memory2 = parseMemory(memoryText2 || '');

      // Memory should have increased
      expect(memory2).toBeGreaterThan(memory1);
      
      // Check leaked resource counters
      const statsText = await page.locator('canvas').locator('..').textContent();
      expect(statsText).toContain('leakedTextures');
    });

    test('instancing scene shows instanced draw calls', async ({ page }) => {
      await page.selectOption('select:first-of-type', 'instancing');
      await page.waitForTimeout(1000);

      const instancedText = await page.locator('text=/Instanced/').locator('..').textContent();
      const instancedCalls = parseInt(instancedText?.match(/Instanced\s+(\d+)/)?.[1] || '0');
      
      // Should have at least 1 instanced draw call
      expect(instancedCalls).toBeGreaterThan(0);
    });
  });

  test.describe('Real-time Updates', () => {
    test('stats update without tab switching', async ({ page }) => {
      // Get initial FPS value
      const fpsText1 = await page.locator('text=/FPS/').locator('..').textContent();
      const fps1 = parseFloat(fpsText1?.match(/FPS\s+([0-9.]+)/)?.[1] || '0');

      // Wait a bit
      await page.waitForTimeout(2000);

      // Get new FPS value
      const fpsText2 = await page.locator('text=/FPS/').locator('..').textContent();
      const fps2 = parseFloat(fpsText2?.match(/FPS\s+([0-9.]+)/)?.[1] || '0');

      // FPS should have changed (not stuck)
      expect(fps2).not.toBe(fps1);
      
      // FPS should be reasonable (between 1 and 200)
      expect(fps2).toBeGreaterThan(1);
      expect(fps2).toBeLessThan(200);
    });
  });

  test.describe('Debug Mode Tests', () => {
    test('changing debug mode affects tracking', async ({ page }) => {
      // Set to full mode
      await page.selectOption('select:nth-of-type(2)', 'full');
      await page.waitForTimeout(1000);

      // Should show some stats
      const drawCallText = await page.locator('text=/Draw Calls/').locator('..').textContent();
      const drawCalls = parseInt(drawCallText?.match(/Draw Calls\s+(\d+)/)?.[1] || '0');
      expect(drawCalls).toBeGreaterThan(0);

      // Set to off mode
      await page.selectOption('select:nth-of-type(2)', 'off');
      await page.waitForTimeout(1000);

      // Stats should still be visible but might show different behavior
      const drawCallText2 = await page.locator('text=/Draw Calls/').locator('..').textContent();
      expect(drawCallText2).toBeTruthy();
    });
  });
});