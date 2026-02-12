
import { Particle, createParticles } from '../src/physics/Particle.ts';

// Mock Canvas Context
class MockContext {
    calls = {
        beginPath: 0,
        arc: 0,
        rect: 0,
        fill: 0,
        moveTo: 0,
        fillStyle: 0
    };

    beginPath() { this.calls.beginPath++; }
    arc() { this.calls.arc++; }
    rect() { this.calls.rect++; }
    fill() { this.calls.fill++; }
    moveTo() { this.calls.moveTo++; }

    _fillStyle: string = '';
    set fillStyle(v: string) {
        this.calls.fillStyle++;
        this._fillStyle = v;
    }
    get fillStyle() { return this._fillStyle; }

    reset() {
        this.calls = { beginPath: 0, arc: 0, rect: 0, fill: 0, moveTo: 0, fillStyle: 0 };
    }
}

const ctx = new MockContext() as unknown as CanvasRenderingContext2D;

// Setup particles
const particles: Particle[] = [];
particles.push(...createParticles(1000, 0, 0, 'smoke'));
particles.push(...createParticles(1000, 0, 0, 'fire'));
particles.push(...createParticles(500, 0, 0, 'spark'));
particles.push(...createParticles(200, 0, 0, 'debris'));

// Randomize life to distribute across buckets
for (const p of particles) {
    p.life = Math.random();
}

console.log(`Benchmarking with ${particles.length} particles...`);

// Warmup
Particle.drawParticles(ctx, particles);
(ctx as any).reset();

// Benchmark drawParticles
const start = performance.now();
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
    Particle.drawParticles(ctx, particles);
}

const end = performance.now();
const duration = end - start;
const avgTime = duration / iterations;

console.log(`drawParticles (Optimized): ${avgTime.toFixed(3)} ms/frame`);
console.log(`Calls per frame:`, (ctx as any).calls.beginPath / iterations, 'beginPath');

// Benchmark individual draw (Simulated old behavior)
(ctx as any).reset();
const startOld = performance.now();

for (let i = 0; i < iterations; i++) {
    for (const p of particles) {
        // Manually calling what p.draw() does, avoiding the deprecated method if needed,
        // but p.draw() exists and calls ctx methods directly.
        p.draw(ctx);
    }
}

const endOld = performance.now();
const durationOld = endOld - startOld;
const avgTimeOld = durationOld / iterations;

console.log(`Individual draw (Baseline): ${avgTimeOld.toFixed(3)} ms/frame`);
console.log(`Calls per frame:`, (ctx as any).calls.beginPath / iterations, 'beginPath');

console.log(`Speedup: ${(avgTimeOld / avgTime).toFixed(2)}x`);
