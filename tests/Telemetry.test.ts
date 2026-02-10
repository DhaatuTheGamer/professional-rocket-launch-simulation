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
});
