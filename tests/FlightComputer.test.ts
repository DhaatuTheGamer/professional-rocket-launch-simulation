
import { FlightComputer } from '../src/guidance/FlightComputer.ts';
import { SASMode, IVessel, OrbitalElements, EngineState } from '../src/types/index.ts';

/**
 * Simple test helper to assert conditions
 */
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

function assertClose(actual: number, expected: number, tolerance: number = 0.001, message: string) {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`❌ Assertion failed: ${message} (Expected ${expected}, got ${actual})`);
        throw new Error(message);
    }
}

/**
 * Mock Vessel Factory
 */
function createMockVessel(overrides: Partial<IVessel> = {}): IVessel {
    return {
        x: 0,
        y: 0, // Ground level is 0 in test context usually, but FC uses groundY - y.
        vx: 0,
        vy: 0,
        angle: 0,
        gimbalAngle: 0,
        mass: 10000,
        w: 10,
        h: 20,
        throttle: 0,
        fuel: 1000,
        active: true,
        maxThrust: 100000,
        crashed: false,
        cd: 0.5,
        q: 0,
        apogee: 0,
        health: 100,
        orbitPath: [],
        lastOrbitUpdate: 0,
        aoa: 0,
        stabilityMargin: 0,
        isAeroStable: true,
        liftForce: 0,
        dragForce: 0,
        skinTemp: 300,
        heatShieldRemaining: 1,
        isAblating: false,
        isThermalCritical: false,
        engineState: 'off' as EngineState,
        ignitersRemaining: 3,
        ullageSettled: true,
        actualThrottle: 0,
        applyPhysics: () => {},
        spawnExhaust: () => {},
        draw: () => {},
        explode: () => {},
        ...overrides
    };
}

/**
 * Test suite for FlightComputer
 */
async function runTests() {
    console.log("🧪 Running FlightComputer tests...");

    // 1. Telemetry Calculation
    console.log("  - Testing Telemetry Calculation");
    {
        // PIXELS_PER_METER is 10.
        // groundY = 1000.
        // vessel.y = 900 -> 100px up -> 10m - h(20) = -10m?
        // Wait, alt = (groundY - vessel.y - vessel.h) / PPM
        // If groundY=1000, vessel.y=900, h=20.
        // alt = (1000 - 900 - 20) / 10 = 80 / 10 = 8m.

        const groundY = 1000;
        const fc = new FlightComputer(groundY);
        fc.loadScript("WHEN ALTITUDE > 0 THEN PITCH 90", "Test");
        fc.activate();

        const vessel = createMockVessel({
            y: 900,
            h: 20,
            vx: 10,
            vy: -20, // Moving UP (negative Y)
            fuel: 500,
            throttle: 0.5
        });

        // We need to access private method calculateTelemetry or infer from behavior.
        // But we can check if conditions trigger based on these values.

        // Let's rely on script conditions to verify telemetry.

        // Test Altitude
        // alt = 8m.
        fc.loadScript("WHEN ALTITUDE > 5 THEN STAGE", "Alt Test");
        fc.activate();
        let output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Altitude condition > 5 should trigger at 8m");

        fc.loadScript("WHEN ALTITUDE > 10 THEN STAGE", "Alt Test 2");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === false, "Altitude condition > 10 should NOT trigger at 8m");

        // Test Velocity
        // speed = sqrt(10^2 + (-20)^2) = sqrt(100 + 400) = sqrt(500) ~= 22.36
        fc.loadScript("WHEN VELOCITY > 20 THEN STAGE", "Vel Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Velocity condition > 20 should trigger at 22.36");

        // Test Vertical Velocity
        // vy = -20 (up). VERTICAL_VEL should be 20.
        fc.loadScript("WHEN VERTICAL_VEL > 15 THEN STAGE", "VVel Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Vertical Vel condition > 15 should trigger at 20");

        // Test Horizontal Velocity
        // vx = 10.
        fc.loadScript("WHEN HORIZONTAL_VEL > 5 THEN STAGE", "HVel Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Horizontal Vel condition > 5 should trigger at 10");

        // Test Fuel
        // fuel = 500
        fc.loadScript("WHEN FUEL < 600 THEN STAGE", "Fuel Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Fuel condition < 600 should trigger at 500");
    }

    // 2. Action Execution
    console.log("  - Testing Action Execution");
    {
        const fc = new FlightComputer(0);
        const vessel = createMockVessel();

        // Test Pitch
        fc.loadScript("WHEN ALTITUDE > -1000 THEN PITCH 45", "Pitch Test"); // Always true
        fc.activate();
        let output = fc.update(vessel, 0.1);
        assertClose(output.pitchAngle!, 45 * Math.PI / 180, 0.001, "Pitch should be 45 degrees in radians");

        // Test Throttle
        fc.loadScript("WHEN ALTITUDE > -1000 THEN THROTTLE 50", "Throttle Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        // Script parser converts >1 values to 0-1 range (50 -> 0.5)
        assert(output.throttle === 0.5, "Throttle should be 0.5 (converted from 50%)");

        // Test Stage
        let stageCalled = false;
        fc.onStage = () => { stageCalled = true; };
        fc.loadScript("WHEN ALTITUDE > -1000 THEN STAGE", "Stage Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "Stage output should be true");
        assert(stageCalled === true, "onStage callback should be called");

        // Test SAS
        let sasModeCalled: SASMode | null = null;
        fc.onSASChange = (mode) => { sasModeCalled = mode; };
        fc.loadScript("WHEN ALTITUDE > -1000 THEN SAS PROGRADE", "SAS Test");
        fc.activate();
        output = fc.update(vessel, 0.1);
        assert(output.sasMode === SASMode.PROGRADE, "SAS output should be PROGRADE");
        assert(sasModeCalled === SASMode.PROGRADE, "onSASChange callback should be called with PROGRADE");
    }

    // 3. Logic & Sequential Execution
    console.log("  - Testing Logic & Sequence");
    {
        const fc = new FlightComputer(0);
        const vessel = createMockVessel({ y: 0, h: 0 }); // Alt = 0

        const script = `
            WHEN ALTITUDE > 10 THEN PITCH 80
            WHEN ALTITUDE > 20 THEN PITCH 70
        `;
        fc.loadScript(script, "Seq Test");
        fc.activate();

        // Initial (Alt 0)
        let output = fc.update(vessel, 0.1);
        assert(output.pitchAngle === null, "No pitch initially");

        // Move to 15m
        // alt = -y / 10 = 15 -> y = -150
        vessel.y = -150;
        output = fc.update(vessel, 0.1);
        assertClose(output.pitchAngle!, 80 * Math.PI / 180, 0.001, "Pitch should be 80 at 15m");

        // Move to 25m
        // y = -250
        vessel.y = -250;
        output = fc.update(vessel, 0.1);
        assertClose(output.pitchAngle!, 70 * Math.PI / 180, 0.001, "Pitch should be 70 at 25m");
    }

    // 4. Logical Operators (AND / OR)
    console.log("  - Testing Logical Operators");
    {
        const fc = new FlightComputer(0);
        const vessel = createMockVessel();

        // AND
        fc.loadScript("WHEN ALTITUDE > 10 AND VELOCITY > 100 THEN STAGE", "AND Test");
        fc.activate();

        // 1. Neither
        vessel.y = 0; // Alt 0
        vessel.vx = 0; vessel.vy = 0; // Vel 0
        let output = fc.update(vessel, 0.1);
        assert(output.stage === false, "AND: False/False -> False");

        // 2. One (Alt)
        vessel.y = -200; // Alt 20
        output = fc.update(vessel, 0.1);
        assert(output.stage === false, "AND: True/False -> False");

        // 3. Both
        vessel.vy = -100; vessel.vx = 0; // Speed 100 (needs > 100 so let's do 101)
        vessel.vy = -101;
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "AND: True/True -> True");

        // OR
        fc.loadScript("WHEN ALTITUDE > 10 OR VELOCITY > 100 THEN STAGE", "OR Test");
        fc.activate();

        // Reset vessel
        vessel.y = 0; vessel.vx = 0; vessel.vy = 0;

        // 1. Neither
        output = fc.update(vessel, 0.1);
        assert(output.stage === false, "OR: False/False -> False");

        // 2. One (Alt)
        vessel.y = -200; // Alt 20
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "OR: True/False -> True");

        // Reset and reload for next condition (since STAGE is one-shot and completes)
        fc.loadScript("WHEN ALTITUDE > 10 OR VELOCITY > 100 THEN STAGE", "OR Test 2");
        fc.activate();
        vessel.y = 0; vessel.vy = -101; // Speed 101
        output = fc.update(vessel, 0.1);
        assert(output.stage === true, "OR: False/True -> True");
    }

    // 5. State Persistence
    console.log("  - Testing State Persistence");
    {
        const fc = new FlightComputer(0);
        const vessel = createMockVessel({ y: -500 }); // Alt 50

        // One-shot command
        fc.loadScript("WHEN ALTITUDE > 10 THEN PITCH 45", "Persistence Test");
        fc.activate();

        // First update - triggers
        let output = fc.update(vessel, 0.1);
        assertClose(output.pitchAngle!, 45 * Math.PI / 180, 0.001, "Should set pitch");

        // Second update - condition still true, but one-shot command completed?
        // Wait, "WHEN" implies one-shot in many systems, but let's check parsing.
        // FlightScript.ts defaults `oneShot` to true?
        // No, usually `WHEN` is one-shot, `WHENEVER` (if supported) or similar is continuous.
        // In FlightComputer.ts: `if (command.oneShot) { command.state = 'completed'; ... }`
        // Default parser behavior needs verification.
        // Assuming default is one-shot.

        // If it's one-shot, it shouldn't re-trigger action logic, BUT FlightComputer maintains targetPitch.
        // `if (output.pitchAngle === null && this.state.targetPitch !== null) { output.pitchAngle = ... }`

        // So output should still have pitch 45.
        output = fc.update(vessel, 0.1);
        assertClose(output.pitchAngle!, 45 * Math.PI / 180, 0.001, "Should maintain pitch target in subsequent frames");
    }

    // 6. Abort Logic
    console.log("  - Testing Abort");
    {
        const fc = new FlightComputer(0);
        const vessel = createMockVessel();
        fc.loadScript("WHEN ALTITUDE > 0 THEN ABORT", "Abort Test");
        fc.activate();

        vessel.y = -100; // Alt 10
        const output = fc.update(vessel, 0.1);
        assert(output.abort === true, "Should output abort flag");
        assert(output.throttle === 0, "Abort should cut throttle");
    }

    // 7. Toggle / Pause
    console.log("  - Testing Toggle / Pause");
    {
        const fc = new FlightComputer(0);
        fc.loadScript("WHEN ALTITUDE > 0 THEN PITCH 90", "Toggle Test");

        fc.toggle(); // Activate
        assert(fc.isActive(), "Should be active");

        fc.togglePause();
        assert(fc.state.mode === 'PAUSED', "Should be paused");
        assert(fc.isActive() === false, "isActive should return false when paused (strictly check implementation)");
        // FlightComputer.ts: isActive() { return this.state.mode === 'RUNNING'; }

        fc.togglePause();
        assert(fc.state.mode === 'RUNNING', "Should resume");

        fc.toggle(); // Deactivate
        assert(fc.state.mode === 'OFF', "Should be off");
    }

    console.log("✅ All FlightComputer tests passed!");
}

try {
    runTests().catch(e => {
        console.error(e);
        process.exit(1);
    });
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
