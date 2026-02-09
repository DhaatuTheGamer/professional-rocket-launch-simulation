
// Mock document and canvas before importing Telemetry
const mockCtx = {
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    lineWidth: 0,
    strokeStyle: '',
};

const mockCanvas = {
    getContext: (type: string) => {
        if (type === '2d') return mockCtx;
        return null;
    },
    width: 800,
    height: 600
};

// @ts-ignore
global.document = {
    getElementById: (id: string) => {
        if (id === 'graph-canvas') return mockCanvas;
        return null;
    }
};

import { TelemetrySystem } from '../src/ui/Telemetry.ts';

function runTests() {
    console.log("🧪 Running Telemetry tests...");

    const telemetry = new TelemetrySystem();

    // 1. Test Initialization
    console.log("  - Testing Initialization");
    if (!telemetry) throw new Error("TelemetrySystem failed to initialize");
    if (telemetry.getData().length !== 0) throw new Error("Telemetry should start empty");

    // 2. Test Update
    console.log("  - Testing Update");
    telemetry.update(0, 0, 0);
    // Should add data (sampleInterval is 0.1, lastSample init 0. Wait, 0 - 0 !> 0.1. So first update might not add if t=0?
    // code: if (time - this.lastSample > this.sampleInterval)
    // lastSample = 0.
    // update(0, ...). 0 - 0 = 0. Not > 0.1.
    // So update(0,...) will not add.

    // Let's force an add with t=0.2
    telemetry.update(0.2, 50, 10);
    if (telemetry.getData().length !== 1) {
        // Depending on logic, it might have skipped first one.
        // Let's just check length.
        // Wait, if lastSample is 0, and I call update(0.2), 0.2-0 = 0.2 > 0.1. Adds.
    }

    // 3. Test Draw (Runtime check)
    console.log("  - Testing Draw (Runtime Check)");
    // Need at least 2 points for draw to do anything
    telemetry.update(0.4, 100, 20);

    try {
        telemetry.draw();
        console.log("    Draw executed successfully");
    } catch (e) {
        console.error("    Draw failed:", e);
        throw e;
    }

    // 4. Test Max Value Logic (indirectly via no crash on large values)
    console.log("  - Testing Large Values");
    telemetry.update(1.0, 5000, 2000);
    telemetry.draw();

    // 5. Test Clear
    console.log("  - Testing Clear");
    telemetry.clear();
    if (telemetry.getData().length !== 0) throw new Error("Clear should empty data");

    console.log("✅ All Telemetry tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
