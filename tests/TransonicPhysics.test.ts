import { describe, it, expect } from 'vitest';
import {
    getTransonicDragFactor,
    calculateDragCoefficient,
    calculateCenterOfPressure,
    DEFAULT_AERO_CONFIG
} from '../src/physics/Aerodynamics';

describe('Transonic Aerodynamics', () => {
    describe('Drag Divergence', () => {
        it('should have zero wave drag below Mach 0.8', () => {
            expect(getTransonicDragFactor(0.5)).toBe(0);
            expect(getTransonicDragFactor(0.79)).toBe(0);
        });

        it('should rise significantly near Mach 1.0', () => {
            const dragFactor = getTransonicDragFactor(1.05);
            expect(dragFactor).toBeGreaterThan(1.5); // Peak should be ~2.0
        });

        it('should settle at a higher value for supersonic speeds', () => {
            const dragFactor = getTransonicDragFactor(2.0);
            expect(dragFactor).toBeCloseTo(0.5, 1);
        });

        it('total CD should reflect drag rise', () => {
            const baseCd = 0.3;
            const ar = 0.5;
            const cl = 0; // No lift => no induced drag

            const cdSubsonic = calculateDragCoefficient(cl, baseCd, ar, 0.5);
            expect(cdSubsonic).toBe(baseCd);

            const cdTransonic = calculateDragCoefficient(cl, baseCd, ar, 1.05);
            expect(cdTransonic).toBeGreaterThan(baseCd * 2); // Should more than double
        });
    });

    describe('Center of Pressure Shift', () => {
        const length = 100;

        it('should not shift below Mach 0.8', () => {
            const cpBase = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 0.5);
            const cpLimit = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 0.79);
            expect(cpBase).toBe(cpLimit);
            expect(cpBase).toBe(DEFAULT_AERO_CONFIG.cpPositionFraction * length);
        });

        it('should start shifting at Mach 0.8', () => {
            const cpBase = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 0.5);
            const cpShift = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 0.9);

            // CP moves aft (towards 0 in our coordinate system? Wait, 0 is bottom.)
            // "CP at 25% from bottom (fins/tail)"
            // Aft direction is towards tail (bottom).
            // So if CP moves AFT, it moves CLOSER to 0.
            // Original code: cpFraction = Math.max(0.05, cpFraction - supersonicShift);
            // So yes, smaller value = more aft.

            expect(cpShift).toBeLessThan(cpBase);
        });

        it('should have maximum shift at high Mach', () => {
            const cpTransonic = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 1.0);
            const cpSupersonic = calculateCenterOfPressure(DEFAULT_AERO_CONFIG, length, 2.0);

            expect(cpSupersonic).toBeLessThan(cpTransonic);
        });
    });
});
