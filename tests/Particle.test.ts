
import { Particle, createParticles } from '../src/physics/Particle.ts';

// Simple assert helper
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ ${message}`);
    }
}

// Mock Context
class MockContext {
    calls: any;

    constructor() {
        this.calls = {
            beginPath: 0,
            arc: 0,
            rect: 0,
            fill: 0,
            moveTo: 0,
            fillStyle: 0
        };
    }

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
}

console.log('--- Testing Particle System ---');

// 1. Test Particle Creation and Type IDs
const pSmoke = new Particle(0, 0, 'smoke');
const pFire = new Particle(0, 0, 'fire');
const pSpark = new Particle(0, 0, 'spark');
const pDebris = new Particle(0, 0, 'debris');

assert(pSmoke.typeId === 0, 'Smoke typeId should be 0');
assert(pFire.typeId === 1, 'Fire typeId should be 1');
assert(pSpark.typeId === 2, 'Spark typeId should be 2');
assert(pDebris.typeId === 3, 'Debris typeId should be 3');

// 2. Test Rendering (Optimization)
const ctx = new MockContext() as unknown as CanvasRenderingContext2D;
const particles = [pSmoke, pFire, pSpark, pDebris];

// Render
Particle.drawParticles(ctx, particles);

const calls = (ctx as any).calls;
assert(calls.beginPath >= 4, 'Should call beginPath at least once per batch (4 types)');
assert(calls.fill >= 4, 'Should call fill at least once per batch');

// Smoke/Fire use arc
assert(calls.arc >= 2, 'Should use arc for smoke/fire');
// Spark/Debris use rect
assert(calls.rect >= 2, 'Should use rect for spark/debris');

// 3. Test Update
const initialLife = pSmoke.life;
pSmoke.update(0, 1.0); // 1.0 timeScale
assert(pSmoke.life < initialLife, 'Life should decrease after update');
assert(!pSmoke.isDead(), 'Particle should be alive');

pSmoke.life = 0;
assert(pSmoke.isDead(), 'Particle should be dead when life <= 0');

console.log('All tests passed!');
