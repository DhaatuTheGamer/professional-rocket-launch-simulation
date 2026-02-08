/**
 * SAS - Stability Assist System
 * 
 * Automatic attitude control system inspired by Kerbal Space Program.
 * Maintains rocket orientation using PID control.
 * 
 * Modes:
 * - OFF: No automatic control
 * - STABILITY: Hold current orientation
 * - PROGRADE: Point in direction of velocity
 * - RETROGRADE: Point opposite to velocity (for deceleration/landing)
 */

import { PIDController } from './PIDController';
import { SASMode, IVessel } from '../types';

/**
 * SAS Mode enum for external access
 */
export const SASModes = SASMode;

export class SAS {
    /** Current SAS mode */
    public mode: SASMode;

    /** PID controller for angle control */
    private pid: PIDController;

    /** Target angle for STABILITY mode */
    private targetAngle: number;

    /** Maximum gimbal output (radians) */
    private readonly maxGimbal: number = 0.5;

    /**
     * Create a new SAS controller
     */
    constructor() {
        this.mode = SASMode.OFF;
        // Tuned PID gains for angle control
        // Kp: Response strength
        // Ki: Eliminates steady-state error
        // Kd: Dampens oscillations
        this.pid = new PIDController(5.0, 0.1, 50.0);
        this.targetAngle = 0;
    }

    /**
     * Set the SAS mode
     * 
     * @param mode - New SAS mode
     * @param currentAngle - Current vessel angle (used for STABILITY mode)
     */
    setMode(mode: SASMode, currentAngle: number): void {
        this.mode = mode;

        if (mode === SASMode.STABILITY) {
            this.targetAngle = currentAngle;
        }

        // Reset PID to prevent integral windup from previous mode
        this.pid.reset();
    }

    /**
     * Update SAS and get gimbal command
     * 
     * @param vessel - Vessel to control
     * @param dt - Time delta in seconds
     * @returns Gimbal angle command (radians, clamped to maxGimbal)
     */
    update(vessel: IVessel, dt: number): number {
        if (this.mode === SASMode.OFF) {
            return 0;
        }

        let setpoint = this.targetAngle;

        // Calculate target angle based on mode
        if (this.mode === SASMode.PROGRADE) {
            const speed = Math.sqrt(vessel.vx ** 2 + vessel.vy ** 2);
            if (speed > 1) {
                // Prograde = direction of velocity
                setpoint = Math.atan2(vessel.vx, -vessel.vy);
            }
        } else if (this.mode === SASMode.RETROGRADE) {
            const speed = Math.sqrt(vessel.vx ** 2 + vessel.vy ** 2);
            if (speed > 1) {
                // Retrograde = opposite of velocity
                setpoint = Math.atan2(vessel.vx, -vessel.vy) + Math.PI;
            }
        }

        // Handle angle wrapping for shortest path rotation
        // Prevents spinning 270° when 90° would work
        let error = setpoint - vessel.angle;
        while (error > Math.PI) error -= Math.PI * 2;
        while (error < -Math.PI) error += Math.PI * 2;

        // Use PID with wrapped error
        // Set PID setpoint to 0 and pass negative error as measurement
        this.pid.setpoint = 0;
        const controlOutput = this.pid.update(-error, dt);

        // Clamp to gimbal range
        return Math.max(-this.maxGimbal, Math.min(this.maxGimbal, controlOutput));
    }

    /**
     * Get current mode name for display
     */
    getModeName(): string {
        return this.mode;
    }

    /**
     * Check if SAS is actively controlling
     */
    isActive(): boolean {
        return this.mode !== SASMode.OFF;
    }
}
