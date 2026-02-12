/**
 * Modular Vessel
 *
 * A generic vessel implementation constructed from a VehicleBlueprint.
 * Capable of calculating its own mass, thrust, and fuel properties from parts.
 */

import { Vessel } from './Vessel';
import { VehicleBlueprint } from '../vab/VehicleBlueprint';
import { RocketPart } from '../vab/PartsCatalog';
import { state } from '../state';
import { PIXELS_PER_METER } from '../constants';
import { PIDController } from '../utils/PIDController';
import { DEFAULT_AERO_CONFIG, BOOSTER_AERO_CONFIG } from './Aerodynamics';
import { DEFAULT_TPS_CONFIG, BOOSTER_TPS_CONFIG } from './ThermalProtection';
import { createInitialPropulsionState, PropulsionConfig } from './Propulsion';

export class ModularVessel extends Vessel {
    public blueprint: VehicleBlueprint;
    private pidTilt: PIDController;
    private pidThrottle: PIDController;

    constructor(x: number, y: number, blueprint: VehicleBlueprint) {
        super(x, y);
        this.blueprint = blueprint;

        // Initialize Autopilot PIDs (generic landing PIDs)
        this.pidTilt = new PIDController(-5.0, 0.0, -50.0);
        this.pidThrottle = new PIDController(0.1, 0.001, 0.5);

        this.recalculateStats();
    }

    private recalculateStats(): void {
        let dryMass = 0;
        let fuelCapacity = 0;
        let totalThrust = 0;
        let weightedIspVac = 0;
        let weightedIspSL = 0;
        let engineCount = 0;
        let maxWidth = 0;
        let totalHeight = 0;

        // Iterate all stages to sum mass and size
        // Note: Blueprint stages are 0=bottom, N=top
        this.blueprint.stages.forEach((stage, stageIdx) => {
            let stageHeight = 0;

            stage.parts.forEach(inst => {
                const p = inst.part;
                dryMass += p.mass;
                if (p.fuelCapacity) fuelCapacity += p.fuelCapacity;

                stageHeight += p.height;
                maxWidth = Math.max(maxWidth, p.width);

                // If this is the active stage (Stage 0), sum thrust
                if (stageIdx === 0 && p.thrust) {
                    totalThrust += p.thrust;
                    // Weighted ISP
                    weightedIspVac += (p.ispVac || 300) * p.thrust;
                    weightedIspSL += (p.ispSL || 280) * p.thrust;
                    engineCount++;
                }
            });

            totalHeight += stageHeight;

            // Decoupler
            if (stage.hasDecoupler) {
                dryMass += 50;
                totalHeight += 5;
            }
        });

        this.h = totalHeight;
        this.w = maxWidth;

        // Set Physics Properties
        this.fuelCapacity = fuelCapacity;
        // Note: We assume the vessel starts full.
        // If it was created from a split (staging), the caller might need to adjust currentFuelMass.
        this.currentFuelMass = fuelCapacity;
        this.mass = dryMass + fuelCapacity;

        this.maxThrust = totalThrust;

        if (totalThrust > 0) {
            this.ispVac = weightedIspVac / totalThrust;
            this.ispSL = weightedIspSL / totalThrust;
        } else {
            // Default if no engines
            this.ispVac = 300;
            this.ispSL = 280;
        }

        // Configs
        // If single stage (or stage 0 only), and has engines, treat as booster for aero/TPS
        if (this.blueprint.stages.length === 1 && engineCount > 0) {
            this.aeroConfig = BOOSTER_AERO_CONFIG;
            this.tpsConfig = BOOSTER_TPS_CONFIG;
        } else {
            this.aeroConfig = DEFAULT_AERO_CONFIG;
            this.tpsConfig = DEFAULT_TPS_CONFIG;
        }

        // Propulsion Config
        let totalRestarts = 0;
        if (this.blueprint.stages.length > 0) {
             this.blueprint.stages[0].parts.forEach(inst => {
                 if (inst.part.restarts) totalRestarts = Math.max(totalRestarts, inst.part.restarts);
             });
        }

        const propConfig: PropulsionConfig = {
            spoolUpTime: 2.0,
            spoolDownTime: 0.5,
            igniterCount: totalRestarts || 3,
            minUllageAccel: 0.1,
            ullageSettleTime: 0.5,
            hasEngine: totalThrust > 0
        };

        this.propConfig = propConfig;
        this.propState = createInitialPropulsionState(propConfig);
        this.ignitersRemaining = propConfig.igniterCount;
    }

    draw(ctx: CanvasRenderingContext2D, camY: number): void {
        if (this.crashed) return;

        ctx.save();
        ctx.translate(this.x, this.y - camY);
        ctx.rotate(this.angle);

        this.drawPlasma(ctx);
        this.drawShockwave(ctx);

        let currentY = 0;

        // Draw stages in reverse order (Top to Bottom) to match visual stack
        for (let i = this.blueprint.stages.length - 1; i >= 0; i--) {
            const stage = this.blueprint.stages[i];

            // Draw parts in stage (Parts are usually listed bottom-to-top)
            // To draw top-down, we iterate in reverse
            for (let j = stage.parts.length - 1; j >= 0; j--) {
                const part = stage.parts[j].part;

                ctx.fillStyle = this.getPartColor(part);

                const px = -part.width / 2;
                const py = currentY;

                // Draw part body
                ctx.fillRect(px, py, part.width, part.height);

                // Engine Nozzle
                if (part.category === 'engine' && i === 0) {
                     // Draw nozzle
                     ctx.save();
                     ctx.translate(0, py + part.height);
                     // Apply gimbal only if this is the active stage engine
                     if (part.gimbalRange) {
                         ctx.rotate(this.gimbalAngle);
                     }
                     ctx.fillStyle = '#444';
                     ctx.beginPath();
                     ctx.moveTo(-part.width/4, 0);
                     ctx.lineTo(-part.width/3, part.height * 0.5);
                     ctx.lineTo(part.width/3, part.height * 0.5);
                     ctx.lineTo(part.width/4, 0);
                     ctx.fill();
                     ctx.restore();
                } else if (part.category === 'fairing') {
                    // Simple fairing shape
                    ctx.beginPath();
                    ctx.moveTo(px, py + part.height);
                    ctx.lineTo(px, py + 10);
                    ctx.quadraticCurveTo(0, py - 20, px + part.width, py + 10);
                    ctx.lineTo(px + part.width, py + part.height);
                    ctx.fill();
                }

                currentY += part.height;
            }

            if (stage.hasDecoupler) {
                // Draw decoupler
                ctx.fillStyle = '#222';
                ctx.fillRect(-20, currentY, 40, 5);
                currentY += 5;
            }
        }

        // Landing legs (visual only) if single stage
        if (this.blueprint.stages.length === 1 && (state.groundY - this.y - this.h) / PIXELS_PER_METER < 200) {
             ctx.fillStyle = '#111';
             ctx.fillRect(-this.w/2 - 20, this.h - 10, 20, 5);
             ctx.fillRect(this.w/2, this.h - 10, 20, 5);
        }

        ctx.restore();
    }

    private getPartColor(part: RocketPart): string {
        switch (part.category) {
            case 'tank': return '#eee';
            case 'engine': return '#333';
            case 'fairing': return '#fff';
            case 'avionics': return '#ccc';
            case 'decoupler': return '#222';
            case 'srb': return '#ddd';
            default: return '#999';
        }
    }

    applyPhysics(dt: number, keys: Record<string, boolean>): void {
        // Run autopilot if enabled and we have control authority
        if (state.autopilotEnabled && this.active && !this.crashed && this.maxThrust > 0) {
            this.runAutopilot(dt);
        }
        super.applyPhysics(dt, keys);
    }

    // Autopilot logic adapted from Booster class
    protected override runAutopilot(dt: number): void {
        const alt = (state.groundY - this.y - this.h) / PIXELS_PER_METER;

        // 1. Angle control - keep vertical
        const tiltOutput = this.pidTilt.update(this.angle, dt);
        this.gimbalAngle = Math.max(-0.4, Math.min(0.4, tiltOutput));

        // 2. Suicide burn calculation
        const g = 9.8;
        const maxAccel = (this.maxThrust / this.mass) - g;

        if (maxAccel <= 0) return; // Cannot hover/land

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
}
