import { describe, it, expect } from 'vitest';
import { FlightComputer } from '../src/guidance/FlightComputer';
import type { IVessel } from '../src/types/index';

// Mock vessel helper
function createMockVessel(overrides: Partial<IVessel> = {}): IVessel {
    return {
        x: 0, y: 0, vx: 0, vy: 0, angle: 0, gimbalAngle: 0,
        mass: 1000, w: 10, h: 40, throttle: 0, fuel: 1000,
        active: true, maxThrust: 100000, crashed: false,
        cd: 0.5, q: 0, apogee: 0, health: 100, orbitPath: null,
        lastOrbitUpdate: 0, aoa: 0, stabilityMargin: 0, isAeroStable: true,
        liftForce: 0, dragForce: 0, skinTemp: 300, heatShieldRemaining: 1,
        isAblating: false, isThermalCritical: false, engineState: 'off',
        ignitersRemaining: 2, ullageSettled: true, actualThrottle: 0,
        applyPhysics: () => { }, spawnExhaust: () => { }, draw: () => { }, explode: () => { },
        ...overrides
    } as IVessel;
}

describe('FlightComputer', () => {
    describe('Initialization', () => {
        it('should initialize to OFF mode', () => {
            const fc = new FlightComputer(0);
            expect(fc.state.mode).toBe('OFF');
            expect(fc.state.script).toBeNull();
        });
    });

    describe('Script Loading', () => {
        it('should load valid script', () => {
            const fc = new FlightComputer(0);
            const script = `WHEN ALTITUDE > 100 THEN PITCH 80`;
            const result = fc.loadScript(script, 'Test Script');

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(fc.state.mode).toBe('STANDBY');
            expect(fc.state.script).not.toBeNull();
            expect(fc.state.script?.commands).toHaveLength(1);
        });

        it('should handle empty script', () => {
            const fc = new FlightComputer(0);
            const script = `// just comments`;
            const result = fc.loadScript(script, 'Empty');

            expect(result.success).toBe(true);
            expect(fc.state.mode).toBe('STANDBY');

            // Should fail to activate if no commands
            fc.activate();
            expect(fc.state.mode).toBe('STANDBY');
        });
    });

    describe('Execution Logic', () => {
        it('should handle activation cycle', () => {
            const fc = new FlightComputer(0);
            fc.loadScript(`WHEN ALTITUDE > 0 THEN PITCH 90`);

            fc.activate();
            expect(fc.state.mode).toBe('RUNNING');
            expect(fc.state.elapsedTime).toBe(0);

            fc.deactivate();
            expect(fc.state.mode).toBe('OFF');
        });

        it('should return nulls when inactive', () => {
            const fc = new FlightComputer(0);
            const v = createMockVessel();
            const out = fc.update(v, 0.1);
            expect(out.pitchAngle).toBeNull();
            expect(out.throttle).toBeNull();
            expect(out.stage).toBe(false);
        });

        it('should trigger commands when conditions met', () => {
            const fc = new FlightComputer(0); // groundY = 0
            // y is up (negative in canvas coords usually, but let's check implementation)
            // Implementation: alt = (groundY - y - h) / PPM.
            // If y=-1500, h=0, groundY=0 -> alt = 1500/10 = 150.

            fc.loadScript(`WHEN ALTITUDE > 100 THEN PITCH 45`);
            fc.activate();

            const v = createMockVessel({ y: -1500, h: 0 }); // Alt 150
            const out = fc.update(v, 0.1);

            expect(out.pitchAngle).not.toBeNull();
            expect(out.pitchAngle).toBeCloseTo(45 * Math.PI / 180, 3);
        });

        it('should handle one-shot commands (STAGE)', () => {
            const fc = new FlightComputer(0);
            fc.loadScript(`WHEN ALTITUDE > 10 THEN STAGE`);
            fc.activate();

            const v = createMockVessel({ y: -200, h: 0 }); // Alt 20

            // First frame: Trigger
            let out = fc.update(v, 0.1);
            expect(out.stage).toBe(true);

            // Second frame: No Trigger
            out = fc.update(v, 0.1);
            expect(out.stage).toBe(false);
        });
    });
});
