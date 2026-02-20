
import { describe, test, expect } from 'vitest';

// Mock Canvas Context
class MockCanvasContext {
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
        return {
            addColorStop: (offset: number, color: string) => { },
        };
    }
    fillStyle: any;
    fillRect(x: number, y: number, w: number, h: number) { }
}

function originalGradientLogic(ctx: any, width: number, height: number, cameraY: number) {
    // Sky gradient
    const alt = -cameraY;
    const spaceRatio = Math.min(Math.max(alt / 60000, 0), 1);

    const grd = ctx.createLinearGradient(0, 0, 0, height);
    const rBot = Math.floor(135 * (1 - spaceRatio));
    const gBot = Math.floor(206 * (1 - spaceRatio));
    const bBot = Math.floor(235 * (1 - spaceRatio));
    const bTop = Math.floor(20 * (1 - spaceRatio));

    grd.addColorStop(0, `rgb(0, 0, ${bTop})`);
    grd.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
}

// Proposed optimized logic
class GradientCache {
    private lastHeight: number = -1;
    private lastStep: number = -1;
    private cachedGradient: any = null;

    update(ctx: any, width: number, height: number, cameraY: number) {
        // Map altitude to a 0-100 integer scale for fast cache checks
        // 60000m / 100 steps = 600m per step.
        // Bitwise OR 0 is a fast integer truncation in JS
        const alt = -cameraY;
        let step = (alt / 600) | 0;

        // Clamp between 0 and 100
        if (step < 0) step = 0;
        else if (step > 100) step = 100;

        if (
            this.cachedGradient !== null &&
            this.lastHeight === height &&
            this.lastStep === step
        ) {
            ctx.fillStyle = this.cachedGradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }

        // Cache miss: calculate new gradient
        const spaceRatio = step / 100;
        const invRatio = 1 - spaceRatio;

        const rBot = (135 * invRatio) | 0;
        const gBot = (206 * invRatio) | 0;
        const bBot = (235 * invRatio) | 0;
        const bTop = (20 * invRatio) | 0;

        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, `rgb(0, 0, ${bTop})`);
        grd.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);

        this.cachedGradient = grd;
        this.lastHeight = height;
        this.lastStep = step;

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
    }
}

describe('Sky Gradient Benchmark', () => {
    test('Performance Comparison', () => {
        const ctx = new MockCanvasContext();
        const width = 1920;
        const height = 1080;
        const iterations = 100000;

        // Simulate a rocket launch: altitude increases from 0 to 70000 over iterations
        // This means spaceRatio changes gradually.

        // Baseline
        const startBase = performance.now();
        for (let i = 0; i < iterations; i++) {
            // Simulate slow ascent, altitude changing slowly
            // e.g., 0.5 meters per iteration
            const cameraY = -(i * 0.5);
            originalGradientLogic(ctx, width, height, cameraY);
        }
        const endBase = performance.now();
        const timeBase = endBase - startBase;

        // Optimized
        const cache = new GradientCache();
        const startOpt = performance.now();
        for (let i = 0; i < iterations; i++) {
            const cameraY = -(i * 0.5);
            cache.update(ctx, width, height, cameraY);
        }
        const endOpt = performance.now();
        const timeOpt = endOpt - startOpt;

        console.log(`Baseline time: ${timeBase.toFixed(2)}ms`);
        console.log(`Optimized time: ${timeOpt.toFixed(2)}ms`);
        console.log(`Speedup: ${(timeBase / timeOpt).toFixed(2)}x`);

        expect(timeOpt).toBeLessThan(timeBase);
    });
});
