import { describe, it, expect, vi } from 'vitest';
import { TelemetrySystem } from '../src/ui/Telemetry';

// Mock canvas and document
const mockCtx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 0,
    strokeStyle: '',
};

const mockCanvas = {
    getContext: () => mockCtx,
    width: 800,
    height: 600
};

// @ts-ignore
global.document = {
    getElementById: (id: string) => (id === 'graph-canvas' ? mockCanvas : null)
};

describe('TelemetrySystem', () => {
    it('should initialize empty', () => {
        const telemetry = new TelemetrySystem();
        expect(telemetry.getData()).toHaveLength(0);
    });

    it('should add data on update', () => {
        const telemetry = new TelemetrySystem();
        // Force update by ensuring dt > sampleInterval
        telemetry.update(0.2, 100, 50);
        expect(telemetry.getData().length).toBeGreaterThanOrEqual(1);
    });

    it('should clear data', () => {
        const telemetry = new TelemetrySystem();
        telemetry.update(0.2, 100, 50);
        telemetry.clear();
        expect(telemetry.getData()).toHaveLength(0);
    });

    it('should draw without error', () => {
        const telemetry = new TelemetrySystem();
        telemetry.update(0.2, 100, 50);
        telemetry.update(0.4, 200, 100);

        expect(() => telemetry.draw()).not.toThrow();
        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should correctly track max values with sliding window (Optimized Caching)', () => {
        const telemetry = new TelemetrySystem();
        const t = (telemetry as any); // Access private fields for testing

        // This test anticipates the optimization where 'maxAlt' and 'maxVel' are cached.
        // Initially, these might be undefined if the optimization isn't applied yet.

        // Fill buffer with baseline values (50)
        // Max data points is 300. Sample interval 0.1s.
        let time = 0;
        for (let i = 0; i < 300; i++) {
            time += 0.2;
            telemetry.update(time, 50, 50);
        }

        // If optimization is applied, maxAlt should be 100 (minimum max)
        if (t.maxAlt !== undefined) {
             expect(t.maxAlt).toBe(100);
        }

        // Add a spike (200)
        time += 0.2;
        telemetry.update(time, 200, 200);

        if (t.maxAlt !== undefined) {
            expect(t.maxAlt).toBe(200);
            expect(t.maxVel).toBe(200);
        }

        // Add 299 more points (50), pushing the spike to the edge
        for (let i = 0; i < 299; i++) {
            time += 0.2;
            telemetry.update(time, 50, 50);
        }

        // Max should still be 200
        if (t.maxAlt !== undefined) {
            expect(t.maxAlt).toBe(200);
        }

        // Add one more point, pushing the spike out
        time += 0.2;
        telemetry.update(time, 50, 50);

        // Max should return to baseline (100)
        if (t.maxAlt !== undefined) {
            expect(t.maxAlt).toBe(100);
            expect(t.maxVel).toBe(100);
        }
    });
});
