import { describe, it, expect, beforeEach } from 'vitest';
import { FullStack, Booster, UpperStage, Payload, Fairing } from '../src/physics/RocketComponents';
import { PhysicsContext } from '../src/types';

// Mock context for tests
const mockContext: PhysicsContext = {
    groundY: 5000,
    windVelocity: { x: 0, y: 0 },
    densityMultiplier: 1.0,
    missionLog: null,
    audio: null,
    autopilotEnabled: true,
    addParticle: () => {}
};

describe('RocketComponents', () => {
    describe('Initialization', () => {
        it('FullStack should have mass and engine off', () => {
            const fs = new FullStack(0, 0);
            expect(fs.mass).toBeGreaterThan(0);
            expect(fs.propState.engineState).toBe('off');
        });

        it('Booster should have mass and fuel', () => {
            const b = new Booster(0, 0);
            expect(b.mass).toBeGreaterThan(0);
            expect(b.fuel).toBeGreaterThan(0);
        });

        it('UpperStage should have mass with undeployed fairings', () => {
            const us = new UpperStage(0, 0);
            expect(us.mass).toBeGreaterThan(0);
            expect(us.fairingsDeployed).toBe(false);
        });

        it('Payload should have mass and no igniters', () => {
            const p = new Payload(0, 0);
            expect(p.mass).toBeGreaterThan(0);
            expect(p.ignitersRemaining).toBe(0);
        });

        it('Fairing should be inactive', () => {
            const f = new Fairing(0, 0);
            expect(f.active).toBe(false);
        });
    });

    describe('Booster Autopilot (Suicide Burn)', () => {
        // No beforeEach needed for global state, we use mockContext

        it('should not burn at high altitude', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.crashed = false;
            b.fuel = 1.0;
            b.vy = 50;
            b.applyPhysics(0.1, {}, mockContext);
            expect(b.throttle).toBe(0);
        });

        it('should burn when approaching stop distance', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.crashed = false;
            b.fuel = 1.0;
            b.y = 3700; // Close to groundY=5000 (h=100) -> alt ~ 1200
            // Wait, groundY is 5000. b.y is 3700. h is 100.
            // alt = (5000 - 3700 - 100)/20 = 1200/20 = 60m?
            // PIXELS_PER_METER is probably 20? Let's check config.
            // Assuming default constants.
            b.vy = 100;
            // Stop dist for v=100?
            b.applyPhysics(0.1, {}, mockContext);
            // It should throttle up
            expect(b.throttle).toBe(1.0);
        });

        it('should modulate throttle for precision landing', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.crashed = false;
            b.fuel = 1.0;
            b.y = 4500;
            b.vy = 10;
            b.applyPhysics(0.1, {}, mockContext);
            expect(b.throttle).toBeGreaterThan(0.5);
            expect(b.throttle).toBeLessThan(1.0);
        });

        it('should cut throttle at touchdown', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.crashed = false;
            b.fuel = 1.0;
            b.y = 4895; // Close to groundY=5000-100=4900
            b.applyPhysics(0.1, {}, mockContext);
            expect(b.throttle).toBe(0);
        });
    });

    describe('Booster Tilt Control', () => {
        it('should deflect gimbal positive for positive tilt', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.angle = 0.1;
            b.applyPhysics(0.1, {}, mockContext);
            expect(b.gimbalAngle).toBeGreaterThan(0);
            expect(b.gimbalAngle).toBeCloseTo(0.4, 2);
        });

        it('should deflect gimbal negative for negative tilt', () => {
            const b = new Booster(0, 0);
            b.active = true;
            b.angle = -0.1;
            b.applyPhysics(0.1, {}, mockContext);
            expect(b.gimbalAngle).toBeLessThan(0);
        });
    });
});
