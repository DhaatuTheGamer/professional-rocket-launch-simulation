
// --- Mocks ---

class MockAudioContext {
    createGain() { return { connect: () => {}, gain: { value: 0 } }; }
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0 }, type: '' }; }
    destination = {};
    currentTime = 0;
}

class MockElement {
    id: string;
    style: any = {};
    textContent: string = '';
    className: string = '';
    constructor(id: string) { this.id = id; }
    getContext(type: string) {
        if (type === '2d') {
            return {
                clearRect: () => {},
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                moveTo: () => {},
                lineTo: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                createLinearGradient: () => ({ addColorStop: () => {} }),
            };
        }
        return null;
    }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
    addEventListener() {}
}

const mockDoc = {
    getElementById: (id: string) => {
        return new MockElement(id);
    },
    createElement: (tag: string) => {
        return new MockElement(tag);
    },
    addEventListener: () => {},
};

// @ts-ignore
global.AudioContext = MockAudioContext;
// @ts-ignore
global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
};
// @ts-ignore
global.document = mockDoc;
// @ts-ignore
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

// --- Import Game ---
// We need to import Game after mocking globals because it uses them in constructor/initHUDCache
import { Game } from '../src/core/Game.ts';

async function runTest() {
    console.log("🧪 Running HUD Performance Regression Test...");

    // Spy on getElementById
    let getElementByIdCallCount = 0;
    const originalGetElementById = global.document.getElementById;

    // We want to count calls specifically during the update loop, not initialization.
    // So we'll wrap it later.

    // Initialize Game
    console.log("  - Initializing Game...");
    const game = new Game();

    // Mock Environment State
    const envState = {
        windVelocity: { x: 0, y: 0 },
        gustVelocity: { x: 0, y: 0 },
        timeOfDay: 12,
        densityMultiplier: 1.0,
        isLaunchSafe: true,
        surfaceWindSpeed: 5.0,
        surfaceWindDirection: 0,
        maxQWindWarning: false
    };

    // Now start spying
    global.document.getElementById = (id: string) => {
        getElementByIdCallCount++;
        return originalGetElementById(id);
    };

    console.log("  - Running updateEnvironmentHUD...");

    // Call the private method via 'any' cast
    (game as any).updateEnvironmentHUD(envState);

    console.log(`  - document.getElementById call count: ${getElementByIdCallCount}`);

    if (getElementByIdCallCount === 0) {
        console.log("✅ SUCCESS: updateEnvironmentHUD did not call document.getElementById");
    } else {
        console.error(`❌ FAILURE: updateEnvironmentHUD called document.getElementById ${getElementByIdCallCount} times!`);
        process.exit(1);
    }

    // Also verify that it handles changes correctly (dirty checking)
    console.log("  - Running update with changed state...");
    const newEnvState = { ...envState, surfaceWindSpeed: 15.0, maxQWindWarning: true };

    (game as any).updateEnvironmentHUD(newEnvState);

    if (getElementByIdCallCount === 0) {
        console.log("✅ SUCCESS: updateEnvironmentHUD with state change did not call document.getElementById");
    } else {
        console.error(`❌ FAILURE: updateEnvironmentHUD (change) called document.getElementById!`);
        process.exit(1);
    }
}

runTest().catch(e => {
    console.error("Test failed with exception:", e);
    process.exit(1);
});
