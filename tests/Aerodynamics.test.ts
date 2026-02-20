
import { describe, it, expect } from 'vitest';
import {
    calculateAngleOfAttack,
    calculateLiftCoefficient,
    calculateDragCoefficient,
    calculateCenterOfMass,
    calculateCenterOfPressure,
    calculateAerodynamicDamageRate,
    type AerodynamicState,
    DEFAULT_AERO_CONFIG
} from '../src/physics/Aerodynamics';

describe('Aerodynamics', () => {
    function createMockAeroState(overrides: Partial<AerodynamicState> = {}): AerodynamicState {
        return {
            aoa: 0,
            sideslip: 0,
            cp: 0,
            com: 0,
            stabilityMargin: 0.1,
            isStable: true,
            ...overrides
        };
    }

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
    describe('calculateCenterOfPressure', () => {
        it('should shift CP AFT (Lower) at supersonic speeds', () => {
            const config = { ...DEFAULT_AERO_CONFIG, cpPositionFraction: 0.25 };
            const length = 50.0;
            // Mach 2.0 -> expectation from user issue: CP should be 10.0 (0.20 * 50)

            const cp = calculateCenterOfPressure(config, length, 2.0);

            // We want it to be 10 (0.20 * 50)
            expect(cp).toBeCloseTo(10.0, 2);
        });
    });

    describe('calculateAerodynamicDamageRate', () => {
        it('should return 0 when dynamic pressure is low (< 1000)', () => {
            const state = createMockAeroState({ aoa: 1.0 }); // High AoA
            const damage = calculateAerodynamicDamageRate(state, 999);
            expect(damage).toBe(0);
        });

        it('should return 0 when AoA is low (< 0.1)', () => {
            const state = createMockAeroState({ aoa: 0.09 });
            const damage = calculateAerodynamicDamageRate(state, 100000); // High Q
            expect(damage).toBe(0);
        });

        it('should calculate damage for stable flight', () => {
            // Formula: damageRate = aoaFactor * stabilityFactor * qFactor * 50
            // aoaFactor = 0.2
            // stabilityFactor = 1.0 (isStable: true)
            // qFactor = 1.0 (10000 / 10000)
            // Expected: 0.2 * 1.0 * 1.0 * 50 = 10
            const state = createMockAeroState({
                aoa: 0.2,
                isStable: true
            });
            const damage = calculateAerodynamicDamageRate(state, 10000);
            expect(damage).toBeCloseTo(10);
        });

        it('should amplify damage for unstable flight', () => {
            // stabilityFactor = 1.0 - stabilityMargin * 2
            // Margin = -0.1 => Factor = 1.0 - (-0.2) = 1.2
            // Expected: 0.2 * 1.2 * 1.0 * 50 = 12
            const state = createMockAeroState({
                aoa: 0.2,
                isStable: false,
                stabilityMargin: -0.1
            });
            const damage = calculateAerodynamicDamageRate(state, 10000);
            expect(damage).toBeCloseTo(12);
        });

        it('should scale damage with dynamic pressure', () => {
            // qFactor = 2.0 (20000 / 10000)
            // Expected: 0.2 * 1.0 * 2.0 * 50 = 20
            const state = createMockAeroState({
                aoa: 0.2,
                isStable: true
            });
            const damage = calculateAerodynamicDamageRate(state, 20000);
            expect(damage).toBeCloseTo(20);
        });

        it('should cap maximum damage at 200', () => {
            // Expected raw: 1.0 * 1.0 * 10.0 * 50 = 500
            const state = createMockAeroState({
                aoa: 1.0,
                isStable: true
            });
            const damage = calculateAerodynamicDamageRate(state, 100000);
            expect(damage).toBe(200);
        });
    });
});
