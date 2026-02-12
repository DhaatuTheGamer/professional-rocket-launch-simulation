/**
 * Particle System
 * 
 * Visual particle effects for exhaust, explosions, and debris.
 * Each particle has physics properties and renders with type-specific appearance.
 */

import type { IParticle, ParticleType } from '../types/index.ts';

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

// Optimization: Map type string to integer ID for fast array lookup
const TYPE_IDS: Record<ParticleType, number> = {
    smoke: 0,
    fire: 1,
    spark: 2,
    debris: 3
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
    public typeId: number; // Optimization: Integer ID
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
        this.typeId = TYPE_IDS[type];
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
     * @deprecated Use Particle.drawParticles for batched rendering instead.
     */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        // Fallback drawing using arc
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

    // Optimization: Flat array of batches to reduce allocation and lookup overhead
    // Structure: [typeId * 20 + lifeIndex] -> Particle[]
    // 4 types * 20 life buckets = 80 total buckets
    private static batches: Particle[][] = Array.from({ length: 80 }, () => []);

    /**
     * Batch render multiple particles
     * Optimizes performance by grouping particles with similar visual properties
     */
    static drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
        const count = particles.length;
        if (count === 0) return;

        // 1. Clear existing batches
        // Since we use a fixed size array, we can iterate efficiently
        const batches = Particle.batches;
        for (let i = 0; i < 80; i++) {
            batches[i].length = 0;
        }

        // 2. Group particles into batches
        for (let i = 0; i < count; i++) {
            const p = particles[i];

            // Quantize life into 20 steps (0.05 increments)
            // Clamp between 0 and 19
            let lifeIndex = Math.floor(p.life * 20);
            if (lifeIndex < 0) lifeIndex = 0;
            else if (lifeIndex > 19) lifeIndex = 19;

            // Use integer ID for fast lookup
            // If p.typeId is missing (e.g. non-Particle implementation), fallback to map
            const typeId = p.typeId ?? TYPE_IDS[p.type];

            // Calculate flat index
            const bucketIndex = typeId * 20 + lifeIndex;

            batches[bucketIndex].push(p);
        }

        // 3. Render each batch
        // We unroll the type loop for clarity and specific optimizations per type

        // Type 0: Smoke (Indices 0-19)
        for (let l = 0; l < 20; l++) {
            const group = batches[l];
            if (group.length === 0) continue;

            const life = (l + 0.5) / 20;

            // Smoke uses instance color (though usually constant 200)
            const sample = group[0];
            const c = Math.floor(sample.color);
            ctx.fillStyle = `rgba(${c},${c},${c},${sample.alpha * life})`;

            ctx.beginPath();
            for (let k = 0; k < group.length; k++) {
                const p = group[k];
                const r = p.size < 0 ? 0 : p.size;
                ctx.moveTo(p.x + r, p.y);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        // Type 1: Fire (Indices 20-39)
        for (let l = 0; l < 20; l++) {
            const group = batches[20 + l];
            if (group.length === 0) continue;

            const life = (l + 0.5) / 20;
            const g = Math.floor(255 * life);
            ctx.fillStyle = `rgba(255,${g},0,${life})`;

            ctx.beginPath();
            for (let k = 0; k < group.length; k++) {
                const p = group[k];
                const r = p.size < 0 ? 0 : p.size;
                ctx.moveTo(p.x + r, p.y);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        // Type 2: Spark (Indices 40-59) - Optimized with rect()
        for (let l = 0; l < 20; l++) {
            const group = batches[40 + l];
            if (group.length === 0) continue;

            const life = (l + 0.5) / 20;
            ctx.fillStyle = `rgba(255, 200, 150, ${life})`;

            ctx.beginPath();
            for (let k = 0; k < group.length; k++) {
                const p = group[k];
                const s = p.size; // Assuming size is radius-like
                // Draw small square centered at x,y
                ctx.rect(p.x - s, p.y - s, s * 2, s * 2);
            }
            ctx.fill();
        }

        // Type 3: Debris (Indices 60-79) - Optimized with rect()
        for (let l = 0; l < 20; l++) {
            const group = batches[60 + l];
            if (group.length === 0) continue;

            const life = (l + 0.5) / 20;
            ctx.fillStyle = `rgba(100,100,100,${life})`;

            ctx.beginPath();
            for (let k = 0; k < group.length; k++) {
                const p = group[k];
                const s = p.size;
                ctx.rect(p.x - s, p.y - s, s * 2, s * 2);
            }
            ctx.fill();
        }
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
