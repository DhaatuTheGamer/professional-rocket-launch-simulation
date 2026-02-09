/**
 * Particle System
 * 
 * Visual particle effects for exhaust, explosions, and debris.
 * Each particle has physics properties and renders with type-specific appearance.
 */

import { IParticle, ParticleType } from '../types';

/**
 * Particle configuration by type
 */
interface ParticleConfig {
    size: number;
    growRate: number;
    decay: number;
    color?: number;
    alpha?: number;
}

const PARTICLE_CONFIGS: Record<ParticleType, Partial<ParticleConfig>> = {
    smoke: {
        size: 15,
        growRate: 1.0,
        decay: 0.01,
        color: 200,
        alpha: 0.5
    },
    fire: {
        size: 8,
        growRate: -0.1,
        decay: 0.08
    },
    spark: {
        size: 2,
        decay: 0.05
    },
    debris: {
        size: 4,
        decay: 0.02
    }
};

export class Particle implements IParticle {
    // Position
    public x: number;
    public y: number;

    // Velocity
    public vx: number;
    public vy: number;

    // Type and visual properties
    public type: ParticleType;
    public life: number;
    public size: number;
    public decay: number;

    // Type-specific properties
    private growRate: number;
    private color: number;
    private alpha: number;

    /**
     * Create a new particle
     * 
     * @param x - Initial X position (pixels)
     * @param y - Initial Y position (pixels)
     * @param type - Particle type for visual appearance
     * @param vx - Initial X velocity (pixels/frame)
     * @param vy - Initial Y velocity (pixels/frame)
     */
    constructor(
        x: number,
        y: number,
        type: ParticleType,
        vx: number = 0,
        vy: number = 0
    ) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;

        // Get base configuration
        const config = PARTICLE_CONFIGS[type];

        // Apply spread based on type
        const spread = type === 'smoke' ? 2 : 1.5;
        this.vx = vx + (Math.random() - 0.5) * spread * 2;
        this.vy = vy + (Math.random() - 0.5) * spread * 2;

        // Apply type-specific properties with randomization
        this.size = (config.size ?? 5) + (Math.random() - 0.5) * 5;
        this.growRate = config.growRate ?? 0;
        this.decay = config.decay ?? 0.05;
        this.color = config.color ?? 255;
        this.alpha = config.alpha ?? 1.0;

        // Special case: debris gets more random velocity
        if (type === 'debris') {
            this.vx = (Math.random() - 0.5) * 20;
            this.vy = (Math.random() - 0.5) * 20;
        }
    }

    /**
     * Update particle state
     * 
     * @param groundLevel - Y position of ground (unused, for interface compat)
     * @param timeScale - Time warp multiplier
     */
    update(groundLevel: number, timeScale: number): void {
        this.life -= this.decay * timeScale;

        // Simple aerodynamic drag
        // Smoke/debris slows down relative to "air" (static frame)
        // Fire maintains velocity more (simulating high pressure jet)
        const drag = 1.0 - (this.type === 'smoke' ? 0.05 : 0.01);

        // Apply drag only if not in vacuum (simplified, assuming scale height effect)
        // Since we don't pass altitude here, we'll just apply generic drag
        // A better approach would be to pass density, but this visual approximation works
        this.vx *= Math.pow(drag, timeScale);
        this.vy *= Math.pow(drag, timeScale);

        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Grow/shrink based on type
        if (this.type === 'smoke') {
            this.size += this.growRate * timeScale;
        }
    }

    /**
     * Draw particle to canvas
     * 
     * @param ctx - Canvas 2D rendering context
     */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);

        switch (this.type) {
            case 'smoke': {
                const c = Math.floor(this.color);
                ctx.fillStyle = `rgba(${c},${c},${c},${this.alpha * this.life})`;
                break;
            }
            case 'fire': {
                const g = Math.floor(255 * this.life);
                ctx.fillStyle = `rgba(255,${g},0,${this.life})`;
                break;
            }
            case 'spark': {
                ctx.fillStyle = `rgba(255, 200, 150, ${this.life})`;
                break;
            }
            case 'debris': {
                ctx.fillStyle = `rgba(100,100,100,${this.life})`;
                break;
            }
        }

        ctx.fill();
    }

    /**
     * Check if particle should be removed
     */
    isDead(): boolean {
        return this.life <= 0;
    }
}

/**
 * Create multiple particles at once (for explosions, exhaust bursts)
 */
export function createParticles(
    count: number,
    x: number,
    y: number,
    type: ParticleType,
    baseVx: number = 0,
    baseVy: number = 0
): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, type, baseVx, baseVy));
    }
    return particles;
}
