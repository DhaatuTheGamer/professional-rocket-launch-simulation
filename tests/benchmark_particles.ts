
// Benchmark for particle spawning logic

// Mock state
const state = {
    groundY: 1000,
    particles: [] as any[]
};

const PIXELS_PER_METER = 10;
const DT = 1/60;

// Mock Particle class to simulate allocation cost
class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: string;
    life: number = 1.0;
    size: number = 5;
    decay: number = 0.05;

    constructor(x: number, y: number, type: string, vx: number = 0, vy: number = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = vx;
        this.vy = vy;
    }
}

// Mock addParticle
function addParticle(p: any) {
    state.particles.push(p);
}

// Context for Vessel
class MockVessel {
    throttle: number = 1.0;
    fuel: number = 1.0;
    crashed: boolean = false;
    x: number = 0;
    y: number = 500;
    angle: number = 0;
    h: number = 100;
    vx: number = 0;
    vy: number = -100;

    spawnExhaustUnoptimized(timeScale: number): void {
        if (this.throttle <= 0 || this.fuel <= 0 || this.crashed) return;

        const count = Math.ceil(this.throttle * 5 * timeScale);

        // Unoptimized: Spawns 'count' particles directly
        const altitude = (state.groundY - this.y - this.h) / PIXELS_PER_METER;
        const vacuumFactor = Math.min(Math.max(0, altitude) / 30000, 1.0);
        const spreadBase = 0.1 + (vacuumFactor * 1.5);
        const exX = this.x - Math.sin(this.angle) * this.h;
        const exY = this.y + Math.cos(this.angle) * this.h;
        const ejectionSpeed = 30 + (this.throttle * 20);

        for (let i = 0; i < count; i++) {
            const particleAngle = this.angle + Math.PI + (Math.random() - 0.5) * spreadBase;
            const ejectVx = Math.sin(particleAngle) * ejectionSpeed;
            const ejectVy = -Math.cos(particleAngle) * ejectionSpeed;

            const rocketVxPx = this.vx * PIXELS_PER_METER * DT;
            const rocketVyPx = this.vy * PIXELS_PER_METER * DT;

            const p = new Particle(exX, exY, 'fire', rocketVxPx + ejectVx, rocketVyPx + ejectVy);

            if (vacuumFactor > 0.8) {
                p.decay *= 0.5;
            }
            addParticle(p);

            if (Math.random() > 0.5 && vacuumFactor < 0.5) {
                const s = new Particle(exX, exY, 'smoke', rocketVxPx + ejectVx, rocketVyPx + ejectVy);
                addParticle(s);
            }
        }
    }

    spawnExhaustOptimized(timeScale: number): void {
        if (this.throttle <= 0 || this.fuel <= 0 || this.crashed) return;

        const rawCount = Math.ceil(this.throttle * 5 * timeScale);

        // Clamp particle count to prevent performance issues during time warp
        const MAX_PARTICLES = 20;
        let count = rawCount;
        let sizeScale = 1.0;

        if (count > MAX_PARTICLES) {
            count = MAX_PARTICLES;
            // Scale size by sqrt of count reduction to maintain visual mass (area)
            sizeScale = Math.sqrt(rawCount / count);
        }

        const altitude = (state.groundY - this.y - this.h) / PIXELS_PER_METER;
        const vacuumFactor = Math.min(Math.max(0, altitude) / 30000, 1.0);
        const spreadBase = 0.1 + (vacuumFactor * 1.5);
        const exX = this.x - Math.sin(this.angle) * this.h;
        const exY = this.y + Math.cos(this.angle) * this.h;
        const ejectionSpeed = 30 + (this.throttle * 20);

        for (let i = 0; i < count; i++) {
            const particleAngle = this.angle + Math.PI + (Math.random() - 0.5) * spreadBase;
            const ejectVx = Math.sin(particleAngle) * ejectionSpeed;
            const ejectVy = -Math.cos(particleAngle) * ejectionSpeed;

            const rocketVxPx = this.vx * PIXELS_PER_METER * DT;
            const rocketVyPx = this.vy * PIXELS_PER_METER * DT;

            const p = new Particle(exX, exY, 'fire', rocketVxPx + ejectVx, rocketVyPx + ejectVy);

            if (sizeScale > 1.0) {
                p.size *= sizeScale;
            }

            if (vacuumFactor > 0.8) {
                p.decay *= 0.5;
            }
            addParticle(p);

            if (Math.random() > 0.5 && vacuumFactor < 0.5) {
                const s = new Particle(exX, exY, 'smoke', rocketVxPx + ejectVx, rocketVyPx + ejectVy);
                if (sizeScale > 1.0) {
                    s.size *= sizeScale;
                }
                addParticle(s);
            }
        }
    }
}

// Run Benchmark
const vessel = new MockVessel();
const ITERATIONS = 1000;
const TIME_SCALE = 100; // 100x warp

console.log(`Running benchmark with TimeScale=${TIME_SCALE}, Iterations=${ITERATIONS}`);

// Unoptimized
state.particles = [];
const startUnopt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    vessel.spawnExhaustUnoptimized(TIME_SCALE);
}
const timeUnopt = performance.now() - startUnopt;
const countUnopt = state.particles.length;

console.log(`Unoptimized: ${timeUnopt.toFixed(2)}ms, Particles created: ${countUnopt}`);

// Optimized
state.particles = [];
const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    vessel.spawnExhaustOptimized(TIME_SCALE);
}
const timeOpt = performance.now() - startOpt;
const countOpt = state.particles.length;

console.log(`Optimized:   ${timeOpt.toFixed(2)}ms, Particles created: ${countOpt}`);

console.log(`Improvement: ${(timeUnopt / timeOpt).toFixed(2)}x faster`);
console.log(`Particle reduction: ${(countUnopt / countOpt).toFixed(2)}x fewer`);
