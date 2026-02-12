/**
 * PID Controller
 *
 * Proportional-Integral-Derivative controller for smooth control systems.
 * Used for booster landing, attitude control, and throttle management.
 *
 * The controller outputs a correction value based on:
 * - Proportional: Current error magnitude
 * - Integral: Accumulated error over time (eliminates steady-state error)
 * - Derivative: Rate of error change (dampens oscillations)
 */

export class PIDController {
    /** Proportional gain */
    public kp: number;

    /** Integral gain */
    public ki: number;

    /** Derivative gain */
    public kd: number;

    /** Target value to achieve */
    public setpoint: number;

    /** Accumulated integral term */
    private integral: number;

    /** Previous error for derivative calculation */
    private lastError: number;

    /**
     * Create a new PID controller
     *
     * @param kp - Proportional gain (response strength)
     * @param ki - Integral gain (steady-state error correction)
     * @param kd - Derivative gain (oscillation dampening)
     * @param setpoint - Target value (default: 0)
     */
    constructor(kp: number, ki: number, kd: number, setpoint: number = 0) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.setpoint = setpoint;
        this.integral = 0;
        this.lastError = 0;
    }

    /**
     * Update the controller and get the output value
     *
     * @param measurement - Current measured value
     * @param dt - Time delta in seconds
     * @returns Control output value
     */
    update(measurement: number, dt: number): number {
        const error = this.setpoint - measurement;

        // Prevent integral windup with dt check
        if (dt > 0) {
            this.integral += error * dt;
        }

        // Calculate derivative (with division-by-zero protection)
        const derivative = dt > 0 ? (error - this.lastError) / dt : 0;
        this.lastError = error;

        // PID formula
        return this.kp * error + this.ki * this.integral + this.kd * derivative;
    }

    /**
     * Reset the controller state
     * Call this when switching control modes or after discontinuities
     */
    reset(): void {
        this.integral = 0;
        this.lastError = 0;
    }

    /**
     * Anti-windup: Clamp the integral term
     * Prevents runaway integral when output is saturated
     *
     * @param min - Minimum integral value
     * @param max - Maximum integral value
     */
    clampIntegral(min: number, max: number): void {
        this.integral = Math.max(min, Math.min(max, this.integral));
    }
}
