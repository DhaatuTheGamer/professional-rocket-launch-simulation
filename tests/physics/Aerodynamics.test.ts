import { describe, it, expect } from 'vitest';
import {
    calculateAngleOfAttack,
    calculateCenterOfMass,
    calculateCenterOfPressure,
    calculateAerodynamicState,
    calculateAerodynamicForces,
    calculateLiftCoefficient,
    calculateDragCoefficient,
    AerodynamicsConfig,
    DEFAULT_AERO_CONFIG
} from '../../src/physics/Aerodynamics';

describe('Aerodynamics Module', () => {
    describe('Angle of Attack (AoA)', () => {
        it('should return 0 at low velocity', () => {
            expect(calculateAngleOfAttack(0.5, 0, 0)).toBe(0);
        });

        it('should calculate AoA correctly for vertical flight', () => {
            // Velocity up (vy negative), body up (angle 0)
            // vy = -100, vx = 0. Velocity angle = atan2(0, 100) = 0.
            // AoA = 0 - 0 = 0.
            expect(calculateAngleOfAttack(0, -100, 0)).toBe(0);
        });

        it('should calculate AoA correctly with side velocity', () => {
            // Velocity up-right (vx=100, vy=-100). Angle = 45 deg (0.785 rad).
            // Body up (0).
            // AoA = 0 - 0.785 = -0.785.
            expect(calculateAngleOfAttack(100, -100, 0)).toBeCloseTo(-Math.PI / 4, 3);
        });
    });

    describe('Center of Mass (CoM)', () => {
        const config: AerodynamicsConfig = {
            ...DEFAULT_AERO_CONFIG,
            comPositionFullFraction: 0.4,
            comPositionEmptyFraction: 0.6
        };
        const len = 50;

        it('should interpolate CoM based on fuel', () => {
            // Full fuel (1.0) -> 0.4 * 50 = 20
            expect(calculateCenterOfMass(config, 1.0, len)).toBeCloseTo(20, 3);

            // Empty fuel (0.0) -> 0.6 * 50 = 30
            expect(calculateCenterOfMass(config, 0.0, len)).toBeCloseTo(30, 3);

            // Half fuel (0.5) -> 0.5 * 50 = 25
            expect(calculateCenterOfMass(config, 0.5, len)).toBeCloseTo(25, 3);
        });
    });

    describe('Center of Pressure (CP)', () => {
        const config = DEFAULT_AERO_CONFIG; // cpPositionFraction 0.75
        const len = 50;

        it('should return static CP at subsonic speeds', () => {
            expect(calculateCenterOfPressure(config, len, 0.5)).toBeCloseTo(0.75 * 50, 3);
        });

        it('should shift CP forward at supersonic speeds', () => {
            // Mach 2.0. Shift = min(0.1, 1.0 * 0.05) = 0.05.
            // New fraction = 0.75 + 0.05 = 0.80.
            expect(calculateCenterOfPressure(config, len, 2.0)).toBeCloseTo(0.80 * 50, 3);
        });
    });

    describe('Aerodynamic Forces', () => {
        const config = DEFAULT_AERO_CONFIG;

        it('should calculate lift coefficient', () => {
            // Small angle approximation or full formula
            // AoA = 0.1 rad.
            // CL ≈ 2π * 0.1 ≈ 0.628.
            const cl = calculateLiftCoefficient(0.1, 2 * Math.PI);
            expect(cl).toBeGreaterThan(0.5);
            expect(cl).toBeLessThan(0.7);
        });

        it('should calculate drag coefficient with induced drag', () => {
            const cd0 = 0.3;
            const ar = 0.5;
            const cl = 1.0;
            // Induced = 1 / (π * 0.8 * 0.5) ≈ 1 / 1.256 ≈ 0.79.
            // Total ≈ 0.3 + 0.79 ≈ 1.09.
            const cd = calculateDragCoefficient(cl, cd0, ar);
            expect(cd).toBeGreaterThan(cd0);
        });
    });
});
