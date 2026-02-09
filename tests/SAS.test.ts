
import { SAS, SASModes } from '../src/utils/SAS.ts';
import type { IVessel } from '../src/types/index.ts';

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
 * Mock Vessel factory
 */
function createMockVessel(angle: number = 0, vx: number = 0, vy: number = 0): IVessel {
    return {
        angle,
        vx,
        vy,
        // Other required properties mocked with defaults
        x: 0, y: 0,
        gimbalAngle: 0,
        mass: 1000,
        w: 10, h: 40,
        throttle: 0,
        fuel: 1000,
        active: true,
        maxThrust: 1000,
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
        engineState: 'OFF',
        ignitersRemaining: 3,
        ullageSettled: true,
        actualThrottle: 0,
        applyPhysics: () => {},
        spawnExhaust: () => {},
        draw: () => {},
        explode: () => {}
    } as unknown as IVessel;
}

/**
 * Test suite for SAS
 */
function runTests() {
    console.log("🧪 Running SAS tests...");

    const sas = new SAS();

    // 1. Initialization
    console.log("  - Testing Initialization");
    assert(sas.mode === SASModes.OFF, "Default mode should be OFF");
    assert(sas.update(createMockVessel(), 0.1) === 0, "Update should return 0 when OFF");
    assert(!sas.isActive(), "Should not be active initially");

    // 2. Stability Mode (Basic)
    console.log("  - Testing Stability Mode (Basic)");
    const vesselBasic = createMockVessel(1.0);
    sas.setMode(SASModes.STABILITY, vesselBasic.angle);
    assert(sas.mode === SASModes.STABILITY, "Mode should be STABILITY");
    assert(sas.isActive(), "Should be active in STABILITY mode");
    assert(sas.getModeName() === 'STABILITY', "Mode name should be STABILITY");

    // Check maintenance of angle
    let output = sas.update(vesselBasic, 0.1);
    assert(Math.abs(output) < 0.0001, `Expected near 0 output on target, got ${output}`);

    // Check correction
    vesselBasic.angle = 1.1; // Drifted +0.1
    output = sas.update(vesselBasic, 0.1);
    assert(Math.abs(output) > 0.1, "Should produce output when off target");


    // 3. Angle Wrapping
    console.log("  - Testing Angle Wrapping (0/2π Boundary)");
    vesselBasic.angle = 0;
    sas.setMode(SASModes.STABILITY, 0);

    const vesselWrap = createMockVessel(6.2); // ~355 degrees
    output = sas.update(vesselWrap, 0.1);
    assert(output > 0, "SAS should wrap angle across 0/2π boundary (Expected Positive Output)");

    console.log("  - Testing Angle Wrapping (π/-π Boundary)");
    const vesselTarget = createMockVessel(3.0);
    sas.setMode(SASModes.STABILITY, vesselTarget.angle); // Target = 3.0
    vesselTarget.angle = -3.0; // Current = -3.0
    output = sas.update(vesselTarget, 0.1);
    assert(output < 0, "SAS should wrap angle across π/-π boundary (Expected Negative Output)");

    // 4. Prograde Mode
    console.log("  - Testing Prograde Mode");
    const vesselPrograde = createMockVessel(0.1, 0, -100); // Angle 0.1, Velocity Up (0, -100) -> Target 0
    sas.setMode(SASModes.PROGRADE, 0.1);
    assert(sas.getModeName() === 'PROGRADE', "Mode name should be PROGRADE");

    output = sas.update(vesselPrograde, 0.1);
    assert(output < 0, "Prograde should correct drift (Expected Negative Output)");

    // 5. Retrograde Mode
    console.log("  - Testing Retrograde Mode");
    // Velocity Up (0, -100).
    // Retrograde = Opposite of Velocity = Down (0, 100). Angle PI.
    const vesselRetro = createMockVessel(3.0, 0, -100); // Angle 3.0 (approx PI).
    sas.setMode(SASModes.RETROGRADE, 3.0);
    assert(sas.getModeName() === 'RETROGRADE', "Mode name should be RETROGRADE");

    output = sas.update(vesselRetro, 0.1);
    assert(output > 0, "Retrograde should correct drift (Expected Positive Output to reach PI)");


    // 6. Low Velocity Handling (Hold Mode)
    console.log("  - Testing Low Velocity Handling");
    const vesselSlow = createMockVessel(1.0, 0, -0.1); // Slow moving

    // First set stability to seed the target angle
    sas.setMode(SASModes.STABILITY, 1.0);
    // Now switch to Prograde. It should inherit target angle because speed < 1
    sas.setMode(SASModes.PROGRADE, 1.0);

    // If speed < 1, it should use targetAngle (1.0).
    // Current angle = 1.0. Output should be 0.
    output = sas.update(vesselSlow, 0.1);
    assert(Math.abs(output) < 0.0001, "Should hold last angle when velocity is too low");

    // Now change angle, it should try to return to 1.0
    vesselSlow.angle = 1.1;
    output = sas.update(vesselSlow, 0.1);
    assert(output < 0, "Should correct to held angle");


    // 7. Output Clamping
    console.log("  - Testing Output Clamping");
    // Create large error
    const vesselFar = createMockVessel(0);
    sas.setMode(SASModes.STABILITY, 0);
    vesselFar.angle = 1.0; // Error -1.0.
    // PID Internal -1.0.
    // Kp=5. Output = -5.0.
    // Should clamp to -0.5.
    output = sas.update(vesselFar, 0.1);
    assert(Math.abs(output - (-0.5)) < 0.0001, `Output should be clamped to -0.5, got ${output}`);

    vesselFar.angle = -1.0; // Error 1.0.
    // PID Internal 1.0.
    // Output 5.0 -> 0.5.
    output = sas.update(vesselFar, 0.1);
    assert(Math.abs(output - 0.5) < 0.0001, `Output should be clamped to 0.5, got ${output}`);


    console.log("✅ All SAS tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
