import { describe, it, expect, vi } from 'vitest';
import { Particle } from '../src/physics/Particle';

describe('Particle System Pooling Benchmark', () => {
    it('should reuse particles from the pool', () => {
        // Create a particle
        const p1 = Particle.create(0, 0, 'smoke');

        // Release it back to pool
        Particle.release(p1);

        // Create another particle - should get the same instance
        const p2 = Particle.create(10, 10, 'fire');

        expect(p2).toBe(p1); // Should be the same instance
        expect(p2.type).toBe('fire'); // Should be reset
        expect(p2.x).toBe(10);
    });

    it('should create new particles when pool is empty', () => {
        const p1 = Particle.create(0, 0, 'smoke');
        const p2 = Particle.create(0, 0, 'smoke');

        expect(p1).not.toBe(p2);
    });

    it('should measure allocation performance', () => {
        const ITERATIONS = 100000;

        // Benchmark with pooling
        const startPool = performance.now();
        // Fill pool first to simulate steady state
        const temp = [];
        for(let i=0; i<100; i++) temp.push(new Particle(0,0,'smoke'));
        for(const p of temp) Particle.release(p);

        for (let i = 0; i < ITERATIONS; i++) {
            const p = Particle.create(0, 0, 'smoke');
            Particle.release(p);
        }
        const endPool = performance.now();
        const poolTime = endPool - startPool;

        // Benchmark with raw allocation
        const startNew = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            const p = new Particle(0, 0, 'smoke');
        }
        const endNew = performance.now();
        const newTime = endNew - startNew;

        console.log(`Pooled time: ${poolTime.toFixed(2)}ms`);
        console.log(`New alloc time: ${newTime.toFixed(2)}ms`);
        console.log(`Speedup: ${(newTime / poolTime).toFixed(2)}x`);

        // Pooling should generally be faster or at least not significantly slower
        // The real win is GC, which isn't measured here.
    });
});
