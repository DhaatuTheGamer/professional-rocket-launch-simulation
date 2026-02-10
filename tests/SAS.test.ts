import { describe, it, expect } from 'vitest';
import { SAS, SASModes } from '../src/utils/SAS';
import type { IVessel } from '../src/types/index';

// Helper to create mock vessel
function createMockVessel(overrides: Partial<IVessel> = {}): IVessel {
    const defaults: any = {
        angle: 0, vx: 0, vy: 0, mass: 1000,
        gimbalAngle: 0, active: true,
        // minimal props to satisfy type
        w: 10, h: 40, throttle: 0
    };
    return { ...defaults, ...overrides } as IVessel;
}

describe('SAS (Stability Augmentation System)', () => {
    const dt = 0.1;

    it('should initialize to OFF', () => {
        const sas = new SAS();
        expect(sas.mode).toBe(SASModes.OFF);
        expect(sas.isActive()).toBe(false);
        expect(sas.update(createMockVessel(), dt)).toBe(0);
    });

    describe('Stability Mode', () => {
        it('should output 0 when on target', () => {
            const sas = new SAS();
            const v = createMockVessel({ angle: 1.0 });
            sas.setMode(SASModes.STABILITY, 1.0);
            expect(sas.update(v, dt)).toBeCloseTo(0, 4);
        });

        it('should correct positive drift (overshoot)', () => {
            const sas = new SAS();
            const v = createMockVessel({ angle: 1.1 }); // Target 1.0
            sas.setMode(SASModes.STABILITY, 1.0);
            const output = sas.update(v, dt);
            expect(output).toBeLessThan(0); // CW rotation
        });

        it('should correct negative drift (undershoot)', () => {
            const sas = new SAS();
            const v = createMockVessel({ angle: 0.9 }); // Target 1.0
            sas.setMode(SASModes.STABILITY, 1.0);
            const output = sas.update(v, dt);
            expect(output).toBeGreaterThan(0); // CCW rotation
        });
    });

    describe('Prograde Mode', () => {
        it('should align with velocity vector', () => {
            const sas = new SAS();
            // Moving Up (vy = -100). Velocity angle = 0.
            const v = createMockVessel({ vx: 0, vy: -100, angle: 0.1 });
            sas.setMode(SASModes.PROGRADE, 0);

            const output = sas.update(v, dt);
            // Current 0.1, Target 0. Error -0.1. Should rotate negative.
            expect(output).toBeLessThan(0);
        });

        it('should handle wrapping correctly', () => {
            const sas = new SAS();
            // Velocity angle 135 deg (2.356 rad). Current angle -172 deg (-3.0 rad).
            // Shortest path is CW rotation (negative).
            const v = createMockVessel({ vx: 1, vy: 1, angle: -3.0 });
            sas.setMode(SASModes.PROGRADE, 0);
            const output = sas.update(v, dt);
            expect(output).toBeLessThan(0);
        });

        it('should fallback to default when velocity is low', () => {
            const sas = new SAS();
            const v = createMockVessel({ vx: 0, vy: 0.5, angle: 1.0 }); // Speed 0.5
            // Default target 0. Current 1.0. Should correct.
            sas.setMode(SASModes.PROGRADE, 0);
            const output = sas.update(v, dt);
            expect(output).toBeLessThan(0);
        });
    });

    // We can keep the test suite concise by checking core logic
    // Implementation covers detailed cases like Retrograde, Clamping, etc.
});
