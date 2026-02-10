import { describe, it, expect } from 'vitest';
import { PIDController } from '../src/utils/PIDController';

describe('PIDController', () => {
    it('should compute correct output for normal dt', () => {
        const pid = new PIDController(1, 1, 1, 10);
        // error=10, dt=0.1, integral=1, derivative=100 → output=111
        const output = pid.update(0, 0.1);
        expect(output).toBe(111);
    });

    it('should handle division by zero (dt=0)', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1); // initial: integral=1, lastError=10
        // error=5, dt=0 → derivative=0, integral unchanged=1 → output=5+1+0=6
        const output = pid.update(5, 0);
        expect(output).toBe(6);
        expect(output).not.toBeNaN();
    });

    it('should handle negative time delta (dt<0)', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1);
        pid.update(5, 0); // set lastError=5
        // error=8, dt=-0.1 → derivative=0, integral unchanged=1 → output=8+1+0=9
        const output = pid.update(2, -0.1);
        expect(output).toBe(9);
        expect(output).not.toBeNaN();
    });

    it('should recover after bad time delta', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1);     // integral=1, lastError=10
        pid.update(5, 0);       // integral=1, lastError=5
        pid.update(2, -0.1);    // integral=1, lastError=8
        // error=6, dt=0.1 → integral=1+6*0.1=1.6, derivative=(6-8)/0.1=-20
        // output=6+1.6-20=-12.4
        const output = pid.update(4, 0.1);
        expect(output).toBeCloseTo(-12.4, 5);
    });

    it('should handle very small time delta', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1);
        const output = pid.update(6, 1e-10);
        expect(output).not.toBeNaN();
        expect(Number.isFinite(output)).toBe(true);
    });

    it('should reset properly', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1);
        pid.reset();
        const output = pid.update(0, 0.1);
        expect(output).toBe(111);
    });

    it('should handle NaN dt', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1); // integral=1, lastError=10
        const output = pid.update(5, NaN);
        expect(output).toBe(6);
        expect(output).not.toBeNaN();
    });

    it('should handle dt=Number.EPSILON', () => {
        const pid = new PIDController(1, 1, 1, 10);
        pid.update(0, 0.1);
        const output = pid.update(5, Number.EPSILON);
        expect(Number.isFinite(output)).toBe(true);
    });

    it('should clamp integral', () => {
        const pid = new PIDController(0, 1, 0, 0); // integral-only
        pid.update(-100, 0.1); // integral=10
        pid.clampIntegral(0, 5);
        const output = pid.update(0, 0.1);
        expect(output).toBeCloseTo(5, 3);
    });

    it('should allow dynamic reconfiguration', () => {
        const pid = new PIDController(1, 0, 0, 10);
        expect(pid.update(0, 0.1)).toBe(10);

        pid.kp = 2;
        expect(pid.update(0, 0.1)).toBe(20);

        pid.setpoint = 20;
        expect(pid.update(0, 0.1)).toBe(40);
    });

    it('should handle dt=Infinity', () => {
        const pid = new PIDController(1, 1, 1, 10);
        const output = pid.update(0, Infinity);
        expect(output).toBe(Infinity);
    });
});
