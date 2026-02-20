import { describe, it, expect, vi } from 'vitest';
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

describe('FlightComputer Staging Fix', () => {
    it('should trigger onStage callback when STAGE command is executed', () => {
        const fc = new FlightComputer(0);
        const onStageSpy = vi.fn();
        fc.onStage = onStageSpy;

        // Script triggers STAGE immediately when altitude > 10
        fc.loadScript(`WHEN ALTITUDE > 10 THEN STAGE`);
        fc.activate();

        const v = createMockVessel({ y: -200, h: 0 }); // Alt 20 (assuming groundY=0, -y is up)

        // Update flight computer
        fc.update(v, 0.1);

        expect(onStageSpy).toHaveBeenCalled();
    });
});
