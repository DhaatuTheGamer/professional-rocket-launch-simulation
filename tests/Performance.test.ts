
import { Game } from '../src/core/Game';
import assert from 'assert';

// Mock DOM
class MockElement {
    id: string;
    textContent: string = '';
    style: any = {};
    className: string = '';
    width: number = 1920;
    height: number = 1080;

    constructor(id: string) {
        this.id = id;
    }

    getContext(type: string) {
        return {
            clearRect: () => {},
            save: () => {},
            translate: () => {},
            rotate: () => {},
            fillRect: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            arc: () => {},
            clip: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            fillText: () => {},
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1
        };
    }

    addEventListener(event: string, callback: any) {}
}

const mockElements = new Map<string, MockElement>();
let getElementByIdCalls = 0;

(global as any).document = {
    getElementById: (id: string) => {
        getElementByIdCalls++;
        if (!mockElements.has(id)) {
            mockElements.set(id, new MockElement(id));
        }
        return mockElements.get(id);
    },
    createElement: (tag: string) => {
        return new MockElement(tag);
    },
    addEventListener: () => {}
};

(global as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {}
};

// Mock Game to access private drawHUD
class TestGame extends Game {
    public testDrawHUD() {
        // Access private method
        (this as any).drawHUD();
    }

    public setTrackedEntity(entity: any) {
        this.trackedEntity = entity;
    }
}

// Mock Vessel
const mockVessel = {
    x: 0,
    y: 1000,
    vx: 100,
    vy: -100,
    h: 50,
    angle: 0,
    throttle: 1.0,
    fuel: 0.5,
    aoa: 0.1,
    stabilityMargin: 0.2,
    isAeroStable: true,
    skinTemp: 300,
    isThermalCritical: false,
    heatShieldRemaining: 0.8,
    isAblating: false,
    engineState: 'running',
    ignitersRemaining: 2
};

async function runTest() {
    console.log('Running Performance Test: Verify NO DOM queries in drawHUD loop');

    // Reset call count (Game constructor calls getElementById)
    getElementByIdCalls = 0;
    const game = new TestGame();
    // Allow constructor calls
    const initialCalls = getElementByIdCalls;
    console.log(`Constructor made ${initialCalls} DOM queries (expected for caching).`);

    game.setTrackedEntity(mockVessel);

    // Reset again before loop
    getElementByIdCalls = 0;

    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
        game.testDrawHUD();
    }

    console.log(`Loop made ${getElementByIdCalls} DOM queries.`);

    if (getElementByIdCalls > 0) {
        console.error('FAIL: drawHUD is querying the DOM!');
        process.exit(1);
    } else {
        console.log('PASS: No DOM queries detected in drawHUD loop.');
    }
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
