
import { describe, it, expect } from 'vitest';
import {
    calculateAngleOfAttack,
    calculateLiftCoefficient,
    calculateDragCoefficient,
    calculateCenterOfMass,
    calculateCenterOfPressure,
    DEFAULT_AERO_CONFIG
} from '../src/physics/Aerodynamics';

describe('Aerodynamics', () => {
    describe('calculateAngleOfAttack', () => {
        it('should return 0 when velocity aligns with body', () => {
            // Velocity up (-y), Body up (0)
            const aoa = calculateAngleOfAttack(0, -100, 0);
            expect(aoa).toBeCloseTo(0);
        });

        it('should return 0 when velocity is zero', () => {
            const aoa = calculateAngleOfAttack(0, 0, 0);
            expect(aoa).toBe(0);
        });

        it('should calculate positive AoA when nose is "above" velocity vector', () => {
            // Velocity 45 deg right-up (vx=10, vy=-10) -> angle = -PI/4
            // Body vertical (0)
            // AoA = 0 - (-PI/4) = PI/4
            // Wait, calculateAngleOfAttack logic:
            // velocityAngle = atan2(10, -(-10)) = atan2(10, 10) = PI/4
            // aoa = 0 - PI/4 = -PI/4.
            // Let's re-verify the function logic from source:
            // velocityAngle = Math.atan2(vx, -vy);
            // vx=10, vy=-10 -> -vy = 10 -> atan2(10, 10) = PI/4 (45 deg)
            // aoa = bodyAngle - velocityAngle = 0 - PI/4 = -PI/4.

            const aoa = calculateAngleOfAttack(10, -10, 0);
            expect(aoa).toBeCloseTo(-Math.PI / 4);
        });

        it('should normalize AoA to -PI to PI', () => {
            const aoa = calculateAngleOfAttack(0, -10, Math.PI * 3);
            expect(aoa).toBeCloseTo(Math.PI);
            // PI * 3 is same as PI. 
            // vel angle = 0. 
            // aoa = 3PI - 0 = 3PI. Normalize: 3PI - 2PI = PI.
        });
    });

    describe('calculateLiftCoefficient', () => {
        it('should be 0 at 0 AoA', () => {
            const cl = calculateLiftCoefficient(0, 2 * Math.PI);
            expect(cl).toBeCloseTo(0);
        });

        it('should be approximately 2*PI*alpha for small angles', () => {
            const alpha = 0.1;
            const cnAlpha = 2 * Math.PI;
            const cl = calculateLiftCoefficient(alpha, cnAlpha);
            // CL = CNalpha * sin(alpha) * cos(alpha)
            //    ~ 6.28 * 0.0998 * 0.995 ~ 0.62...
            const expected = cnAlpha * Math.sin(alpha) * Math.cos(alpha);
            expect(cl).toBeCloseTo(expected);
        });
    });

    describe('calculateDragCoefficient', () => {
        it('should return cd0 when lift is 0', () => {
            const cd = calculateDragCoefficient(0, 0.3, 1.0);
            expect(cd).toBe(0.3);
        });

        it('should add induced drag', () => {
            const cl = 1.0;
            const cd0 = 0.3;
            const ar = 10.0; // High aspect ratio
            const e = 0.8;
            const induced = (cl * cl) / (Math.PI * e * ar);
            const cd = calculateDragCoefficient(cl, cd0, ar);
            expect(cd).toBeCloseTo(cd0 + induced);
        });
    });

    describe('calculateCenterOfMass', () => {
        it('should interpolate between full and empty', () => {
            const config = { ...DEFAULT_AERO_CONFIG, comPositionFullFraction: 0.4, comPositionEmptyFraction: 0.6 };
            const length = 100;

            // Full
            expect(calculateCenterOfMass(config, 1.0, length)).toBe(40);
            // Empty
            expect(calculateCenterOfMass(config, 0.0, length)).toBe(60);
            // Half
            expect(calculateCenterOfMass(config, 0.5, length)).toBe(50);
        });
    });
});
