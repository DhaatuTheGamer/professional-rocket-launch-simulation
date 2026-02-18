import { describe, it, expect, vi } from 'vitest';
import { Particle } from '../src/physics/Particle';
import type { ParticleType } from '../src/types';

describe('Particle System Benchmark', () => {
    // Mock CanvasRenderingContext2D
    const mockCtx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        fill: vi.fn(),
        fillStyle: '',
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    const createParticles = (count: number, type: ParticleType): Particle[] => {
        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(0, 0, type, 0, 0));
        }
        return particles;
    };

    it('should use arc for smoke and fire (large particles)', () => {
        const particles = createParticles(100, 'smoke');
        vi.clearAllMocks();

        Particle.drawParticles(mockCtx, particles);

        // Smoke uses arc
        expect(mockCtx.arc).toHaveBeenCalledTimes(100);
        expect(mockCtx.rect).not.toHaveBeenCalled();
    });

    it('should use rect for spark and debris (small particles)', () => {
        const particles = createParticles(100, 'spark');
        vi.clearAllMocks();

        Particle.drawParticles(mockCtx, particles);

        // After optimization, it uses rect
        expect(mockCtx.rect).toHaveBeenCalledTimes(100);
        expect(mockCtx.arc).not.toHaveBeenCalled();
    });
});
