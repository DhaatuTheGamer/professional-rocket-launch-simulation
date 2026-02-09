
import { FlightComputer, PRESET_SCRIPTS } from '../src/guidance/FlightComputer.ts';
import { parseMissionScript } from '../src/guidance/FlightScript.ts';
import type { IVessel } from '../src/types/index.ts';
import { PIXELS_PER_METER } from '../src/constants.ts';

/**
 * Simple test helper to assert conditions
 */
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

/**
 * Helper to create a mock vessel
 */
function createMockVessel(overrides: Partial<IVessel> = {}): IVessel {
    // Default mock vessel
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: 0,
        gimbalAngle: 0,
        mass: 1000,
        w: 10,
        h: 40,
        throttle: 0,
        fuel: 1000,
        active: true,
        maxThrust: 100000,
        crashed: false,
        cd: 0.5,
        q: 0,
        apogee: 0,
        health: 100,
        orbitPath: null,
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
        engineState: 'off',
        ignitersRemaining: 2,
        ullageSettled: true,
        actualThrottle: 0,
        applyPhysics: () => {},
        spawnExhaust: () => {},
        draw: () => {},
        explode: () => {},
        ...overrides
    } as IVessel;
}

/**
 * Test suite for FlightComputer
 */
function runTests() {
    console.log("🧪 Running FlightComputer tests...");

    // 1. Initialization
    console.log("  - Testing Initialization");
    const fc = new FlightComputer(0); // groundY = 0
    assert(fc.state.mode === 'OFF', "Initial state should be 'OFF'");
    assert(fc.state.script === null, "Initial script should be null");

    // 2. Load Script
    console.log("  - Testing Script Loading");
    const scriptText = `WHEN ALTITUDE > 100 THEN PITCH 80`;
    const loadResult = fc.loadScript(scriptText, "Test Script");

    assert(loadResult.success === true, "Script should load successfully");
    assert(loadResult.errors.length === 0, "No errors should be reported");
    assert(fc.state.mode === 'STANDBY', "Mode should be STANDBY after loading script");
    assert(fc.state.script !== null, "Script should be set in state");
    assert(fc.state.script?.commands.length === 1, "Script should have 1 command");

    // 3. Activate (Normal)
    console.log("  - Testing Activation (Normal)");
    fc.activate();
    assert(fc.state.mode === 'RUNNING', "Mode should be RUNNING after activation");
    assert(fc.state.elapsedTime === 0, "Elapsed time should be reset to 0");

    // Deactivate for next test
    fc.deactivate();
    assert(fc.state.mode === 'OFF', "Mode should be OFF after deactivation");

    // 4. Activate (Empty Script) - The Edge Case
    console.log("  - Testing Activation (Empty Script)");

    // Load an empty script (valid syntax, but no commands)
    const emptyScriptText = `
    // This is a comment
    # This is also a comment

    `;
    const emptyLoadResult = fc.loadScript(emptyScriptText, "Empty Script");

    assert(emptyLoadResult.success === true, "Empty script should load successfully (it's valid to have no commands)");
    assert(fc.state.mode === 'STANDBY', "Mode should be STANDBY after loading empty script");
    assert(fc.state.script !== null, "Script should be set");
    assert(fc.state.script?.commands.length === 0, "Script should have 0 commands");

    // Attempt to activate
    fc.activate();

    // Assert that activation FAILED (remained in STANDBY) because script has no commands
    assert(fc.state.mode === 'STANDBY', "Mode should remain STANDBY when activating with empty script");

    // 5. Activate (No Script)
    console.log("  - Testing Activation (No Script)");
    const fcNoScript = new FlightComputer(0);
    fcNoScript.activate();
    assert(fcNoScript.state.mode === 'OFF', "Mode should remain OFF when activating with no script");

    // 6. Update - Inactive
    console.log("  - Testing Update (Inactive)");
    const fcInactive = new FlightComputer(0);
    const mockVessel = createMockVessel();
    const outputInactive = fcInactive.update(mockVessel, 0.016);

    assert(outputInactive.pitchAngle === null, "Pitch should be null when inactive");
    assert(outputInactive.throttle === null, "Throttle should be null when inactive");
    assert(outputInactive.stage === false, "Stage should be false when inactive");
    assert(outputInactive.abort === false, "Abort should be false when inactive");

    // 7. Update - Active Logic
    console.log("  - Testing Update (Active Logic)");
    const fcActive = new FlightComputer(0);
    const scriptTextActive = `
WHEN ALTITUDE > 100 THEN PITCH 45
WHEN VELOCITY > 50 THEN THROTTLE 100
`;
    fcActive.loadScript(scriptTextActive);
    fcActive.activate();

    // Initial state (Altitude 0, Velocity 0) - Conditions NOT met
    // Note: Altitude = (groundY - y - h) / PIXELS_PER_METER
    // groundY=0, y=0, h=40 => alt = -4 meters (underground/on pad)
    let output = fcActive.update(mockVessel, 0.016);
    assert(output.pitchAngle === null, "Pitch should be null when conditions not met");
    assert(output.throttle === null, "Throttle should be null when conditions not met");

    // Update vessel to meet Altitude condition
    // Altitude = (groundY - y - h) / PIXELS_PER_METER
    // Want Alt > 100
    // (0 - y - 0) / 10 > 100 => -y > 1000 => y < -1000
    const mockVesselHigh = createMockVessel({
        y: -1500, // 150m up
        h: 0, // Simplify math
        vx: 0,
        vy: 0
    });

    output = fcActive.update(mockVesselHigh, 0.016);
    assert(output.pitchAngle !== null, "Pitch should be set when altitude condition met");
    if (output.pitchAngle !== null) {
        const expectedRad = 45 * Math.PI / 180;
        assert(Math.abs(output.pitchAngle - expectedRad) < 0.001, `Pitch should be ~0.785 rad, got ${output.pitchAngle}`);
    }
    assert(output.throttle === null, "Throttle should still be null");

    // Update vessel to meet Velocity condition
    const mockVesselFast = createMockVessel({
        y: -1500,
        h: 0,
        vx: 60, // Velocity > 50
        vy: 0
    });

    output = fcActive.update(mockVesselFast, 0.016);
    assert(output.throttle === 1.0, "Throttle should be 1.0 (100%) when velocity condition met");

    // 8. Update - One-shot vs Continuous
    console.log("  - Testing Update (One-shot vs Continuous)");
    const fcStaging = new FlightComputer(0);
    const scriptStaging = `
WHEN ALTITUDE > 10 THEN STAGE
WHEN ALTITUDE > 10 THEN PITCH 10
`;
    fcStaging.loadScript(scriptStaging);
    fcStaging.activate();

    const mockVesselStaging = createMockVessel({
        y: -200, // 20m up
        h: 0
    });

    // First frame: Should trigger STAGE and PITCH
    output = fcStaging.update(mockVesselStaging, 0.016);
    assert(output.stage === true, "Stage should be true on first trigger");
    assert(output.pitchAngle !== null, "Pitch should be set");

    // Second frame: Should NOT trigger STAGE (one-shot), but should maintain PITCH (continuous or target maintenance)
    output = fcStaging.update(mockVesselStaging, 0.016);
    assert(output.stage === false, "Stage should be false on second frame (one-shot)");
    assert(output.pitchAngle !== null, "Pitch should still be set (continuous/target)");

    console.log("✅ All FlightComputer tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
