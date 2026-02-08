/**
 * Rocket Components
 * 
 * Concrete vessel implementations for different rocket stages.
 * Each extends the base Vessel class with specific properties and rendering.
 */

import { Vessel } from './Vessel';
import { CONFIG, PIXELS_PER_METER } from '../constants';
import { state } from '../state';
import { PIDController } from '../utils/PIDController';
import { StageSeparation } from '../types';
import {
    DEFAULT_AERO_CONFIG,
    BOOSTER_AERO_CONFIG,
    UPPER_STAGE_AERO_CONFIG,
    PAYLOAD_AERO_CONFIG
} from './Aerodynamics';
import {
    DEFAULT_TPS_CONFIG,
    BOOSTER_TPS_CONFIG,
    UPPER_STAGE_TPS_CONFIG,
    PAYLOAD_TPS_CONFIG
} from './ThermalProtection';
import {
    FULLSTACK_PROP_CONFIG,
    BOOSTER_PROP_CONFIG,
    UPPER_STAGE_PROP_CONFIG,
    PAYLOAD_PROP_CONFIG,
    createInitialPropulsionState
} from './Propulsion';

/**
 * Full Stack - Complete rocket before staging
 * First stage booster + second stage + payload fairing
 */
export class FullStack extends Vessel {
    constructor(x: number, y: number) {
        super(x, y);
        this.h = 160;
        this.mass = CONFIG.MASS_BOOSTER + CONFIG.MASS_UPPER + CONFIG.FUEL_MASS;
        this.maxThrust = CONFIG.MAX_THRUST_BOOSTER;
        this.ispVac = CONFIG.ISP_VAC_BOOSTER;
        this.ispSL = CONFIG.ISP_SL_BOOSTER;

        // Full stack has good stability with fins at the base
        this.aeroConfig = DEFAULT_AERO_CONFIG;
        // Standard aluminum skin, moderate thermal tolerance
        this.tpsConfig = DEFAULT_TPS_CONFIG;
        // Merlin-like first stage propulsion
        this.propConfig = FULLSTACK_PROP_CONFIG;
        this.propState = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);
        this.ignitersRemaining = FULLSTACK_PROP_CONFIG.igniterCount;
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        if (this.crashed) return;

        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        this.drawPlasma(ctx);
        this.drawShockwave(ctx);

        const rocketImg = state.assets?.get('rocket_body');
        const engineImg = state.assets?.get('rocket_engine');

        if (rocketImg && engineImg) {
            // Draw engine (gimbaled)
            ctx.save();
            ctx.translate(0, 160);
            ctx.rotate(this.gimbalAngle);
            ctx.drawImage(engineImg, -15, -10, 30, 40);
            ctx.restore();

            // Draw body
            ctx.drawImage(rocketImg, -20, 0, 40, 160);
        } else {
            // Fallback procedural rendering
            // Body (white with nose cone)
            ctx.fillStyle = '#fff';
            ctx.fillRect(-20, 0, 40, 60);
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.quadraticCurveTo(0, -40, 20, 0);
            ctx.fill();

            // First stage (light gray)
            ctx.fillStyle = '#eee';
            ctx.fillRect(-20, 60, 40, 100);

            // Engine (gimbaled)
            ctx.save();
            ctx.translate(0, 160);
            ctx.rotate(this.gimbalAngle);
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-15, 20);
            ctx.lineTo(15, 20);
            ctx.lineTo(10, 0);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}

/**
 * Booster - First stage after separation
 * Capable of propulsive landing with autopilot
 */
export class Booster extends Vessel {
    /** Stage separation config */
    public nextStage: StageSeparation;

    /** PID controller for tilt stabilization */
    private pidTilt: PIDController;

    /** PID controller for throttle during landing */
    private pidThrottle: PIDController;

    constructor(x: number, y: number, vx: number = 0, vy: number = 0) {
        super(x, y);
        this.vx = vx;
        this.vy = vy;
        this.h = 100;
        this.mass = CONFIG.MASS_BOOSTER;
        this.maxThrust = CONFIG.MAX_THRUST_BOOSTER;
        this.fuel = 0.3; // Remaining fuel after staging
        this.ispVac = CONFIG.ISP_VAC_BOOSTER;
        this.ispSL = CONFIG.ISP_SL_BOOSTER;
        this.active = true;

        // PID controllers for landing
        // Negative Kp because positive angle needs negative correction
        this.pidTilt = new PIDController(-5.0, 0.0, -50.0);
        this.pidThrottle = new PIDController(0.1, 0.001, 0.5);

        // Booster has grid fins for stability during descent
        this.aeroConfig = BOOSTER_AERO_CONFIG;
        // Grid fins and re-entry capable with some TPS coating
        this.tpsConfig = BOOSTER_TPS_CONFIG;
        // Landing-capable with multiple restarts
        this.propConfig = BOOSTER_PROP_CONFIG;
        this.propState = createInitialPropulsionState(BOOSTER_PROP_CONFIG);
        this.ignitersRemaining = BOOSTER_PROP_CONFIG.igniterCount;

        this.nextStage = {
            type: 'UpperStage',
            separationVelocity: 3,
            offsetY: -20
        };
    }

    applyPhysics(dt: number, keys: Record<string, boolean>): void {
        if (state.autopilotEnabled && this.active && !this.crashed) {
            this.runAutopilot(dt);
        }
        super.applyPhysics(dt, keys);
    }

    protected override runAutopilot(dt: number): void {
        const alt = (state.groundY - this.y - this.h) / PIXELS_PER_METER;

        // 1. Angle control - keep vertical
        const tiltOutput = this.pidTilt.update(this.angle, dt);
        this.gimbalAngle = Math.max(-0.4, Math.min(0.4, tiltOutput));

        // 2. Suicide burn calculation
        const g = 9.8;
        const maxAccel = (this.maxThrust / this.mass) - g;
        // v² = 2ad → d = v² / 2a
        const stopDist = (this.vy * this.vy) / (2 * maxAccel);

        // Start burn when altitude approaches stopping distance
        if (this.vy > 0 && alt < stopDist + 100) {
            this.throttle = 1.0;

            // Terminal precision control
            if (alt < 50) {
                const targetVel = alt * 0.2;
                const err = this.vy - targetVel;
                this.throttle = Math.min(1, Math.max(0, 0.5 + err * 0.2));
            }
        } else {
            this.throttle = 0;
        }

        // Cut engines at touchdown
        if (alt < 1) {
            this.throttle = 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        if (this.crashed) return;

        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        this.drawPlasma(ctx);

        const rocketImg = state.assets?.get('rocket_body');
        const engineImg = state.assets?.get('rocket_engine');

        if (rocketImg && engineImg) {
            ctx.drawImage(rocketImg, -20, 0, 40, 100);

            ctx.save();
            ctx.translate(0, 100);
            ctx.rotate(this.gimbalAngle);
            ctx.drawImage(engineImg, -15, -10, 30, 40);
            ctx.restore();
        } else {
            ctx.fillStyle = '#eee';
            ctx.fillRect(-20, 0, 40, 100);

            ctx.save();
            ctx.translate(0, 100);
            ctx.rotate(this.gimbalAngle);
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-15, 20);
            ctx.lineTo(15, 20);
            ctx.lineTo(10, 0);
            ctx.fill();
            ctx.restore();
        }

        // Deploy landing legs when low altitude
        if ((state.groundY - this.y - this.h) / PIXELS_PER_METER < 200) {
            ctx.fillStyle = '#111';
            ctx.fillRect(-40, 90, 20, 5);
            ctx.fillRect(20, 90, 20, 5);
        }

        ctx.restore();
    }
}

/**
 * Upper Stage - Second stage after booster separation
 * Contains payload fairing
 */
export class UpperStage extends Vessel {
    /** Whether fairings have been jettisoned */
    public fairingsDeployed: boolean = false;

    /** Stage separation config */
    public nextStage: StageSeparation;

    constructor(x: number, y: number, vx: number = 0, vy: number = 0) {
        super(x, y);
        this.vx = vx;
        this.vy = vy;
        this.h = 60;
        this.mass = CONFIG.MASS_UPPER;
        this.maxThrust = CONFIG.MAX_THRUST_UPPER;
        this.active = true;
        this.ispVac = CONFIG.ISP_VAC_UPPER;
        this.ispSL = CONFIG.ISP_SL_UPPER;

        // Upper stage less stable without booster mass below
        this.aeroConfig = UPPER_STAGE_AERO_CONFIG;
        // Fairing provides protection during ascent
        this.tpsConfig = UPPER_STAGE_TPS_CONFIG;
        // Vacuum engine with slower spool-up
        this.propConfig = UPPER_STAGE_PROP_CONFIG;
        this.propState = createInitialPropulsionState(UPPER_STAGE_PROP_CONFIG);
        this.ignitersRemaining = UPPER_STAGE_PROP_CONFIG.igniterCount;

        this.nextStage = {
            type: 'Payload',
            separationVelocity: 2,
            offsetY: -10
        };
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        if (this.crashed) return;

        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        this.drawPlasma(ctx);
        this.drawShockwave(ctx);

        const rocketImg = state.assets?.get('rocket_body');
        const engineImg = state.assets?.get('rocket_engine');
        const fairingImg = state.assets?.get('fairing');

        if (rocketImg && engineImg) {
            // Engine
            ctx.save();
            ctx.translate(0, 60);
            ctx.drawImage(engineImg, -10, -5, 20, 25);
            ctx.restore();

            // Tank
            ctx.drawImage(rocketImg, -20, 0, 40, 60);

            // Fairing
            if (!this.fairingsDeployed) {
                if (fairingImg) {
                    ctx.drawImage(fairingImg, -20, -40, 40, 40);
                } else {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.moveTo(-20, 0);
                    ctx.quadraticCurveTo(0, -40, 20, 0);
                    ctx.fill();
                }
            } else {
                // Exposed payload indicator
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(-10, -5, 20, 5);
            }
        } else {
            // Engine
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(-10, 60);
            ctx.lineTo(10, 60);
            ctx.lineTo(15, 75);
            ctx.lineTo(-15, 75);
            ctx.fill();

            // Tank
            ctx.fillStyle = '#fff';
            ctx.fillRect(-20, 0, 40, 60);

            // Fairing or payload
            if (!this.fairingsDeployed) {
                ctx.beginPath();
                ctx.moveTo(-20, 0);
                ctx.quadraticCurveTo(0, -40, 20, 0);
                ctx.fill();
            } else {
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(-10, -5, 20, 5);
            }
        }

        ctx.restore();
    }
}

/**
 * Payload - Satellite or other payload after deployment
 */
export class Payload extends Vessel {
    /** Visual color */
    public color: string = '#bdc3c7';

    /** Stage separation config (for debugging/testing) */
    public nextStage: StageSeparation;

    constructor(x: number, y: number, vx: number = 0, vy: number = 0) {
        super(x, y);
        this.vx = vx;
        this.vy = vy;
        this.mass = 1000;
        this.w = 20;
        this.h = 20;
        this.active = true;

        // Payload has neutral stability (satellite shape)
        this.aeroConfig = PAYLOAD_AERO_CONFIG;
        // Full ablative heat shield for re-entry capability
        this.tpsConfig = PAYLOAD_TPS_CONFIG;
        // No main engine (satellite)
        this.propConfig = PAYLOAD_PROP_CONFIG;
        this.propState = createInitialPropulsionState(PAYLOAD_PROP_CONFIG);
        this.ignitersRemaining = 0;

        this.nextStage = {
            type: 'Booster',
            separationVelocity: 5,
            offsetY: -30
        };
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        // Satellite body
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-10, -10, 20, 20);

        // Solar panels
        ctx.fillStyle = '#3498db';
        ctx.fillRect(-40, -5, 30, 10);
        ctx.fillRect(10, -5, 30, 10);

        ctx.restore();
    }
}

/**
 * Fairing - Payload fairing half after separation
 */
export class Fairing extends Vessel {
    /** Which side (left=-1, right=1) */
    public side: number;

    constructor(x: number, y: number, vx: number = 0, vy: number = 0, side: number = 1) {
        super(x, y);
        this.vx = vx + side * 5; // Lateral separation velocity
        this.vy = vy;
        this.side = side;
        this.active = false;  // No thrust
        this.h = 40;
        this.cd = 2.0;  // High drag
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        this.drawPlasma(ctx);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (this.side === -1) {
            ctx.moveTo(0, 0);
            ctx.lineTo(-20, 0);
            ctx.quadraticCurveTo(0, -40, 0, 0);
        } else {
            ctx.moveTo(0, 0);
            ctx.lineTo(20, 0);
            ctx.quadraticCurveTo(0, -40, 0, 0);
        }
        ctx.fill();

        ctx.restore();
    }
}
