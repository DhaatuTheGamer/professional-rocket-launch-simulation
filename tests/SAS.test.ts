
import { SAS, SASModes } from '../src/utils/SAS.ts';
import type { IVessel } from '../src/types/index.ts';

/**
 * Simple assertion helper
 */
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

/**
 * Helper to check if two numbers are approximately equal
 */
function assertApprox(actual: number, expected: number, tolerance: number = 0.0001, message?: string) {
    if (Math.abs(actual - expected) > tolerance) {
        const msg = message ? `${message}: ` : '';
        console.error(`❌ ${msg}Expected ${expected} ±${tolerance}, got ${actual}`);
        throw new Error(`${msg}Value mismatch`);
    }
}

/**
 * Mock Vessel factory
 * Allows creating a partial vessel object for testing SAS logic
 */
function createMockVessel(overrides: Partial<IVessel> = {}): IVessel {
    const defaults: Partial<IVessel> = {
        angle: 0,
        vx: 0,
        vy: 0,
        x: 0, y: 0,
        gimbalAngle: 0,
        mass: 1000,
        active: true,
        // Add minimal required properties to satisfy type, even if unused by SAS
        w: 10, h: 40, throttle: 0, fuel: 1000, maxThrust: 1000, crashed: false, cd: 0.5, q: 0,
        apogee: 0, health: 100, orbitPath: [], lastOrbitUpdate: 0, aoa: 0, stabilityMargin: 0,
        isAeroStable: true, liftForce: 0, dragForce: 0, skinTemp: 300, heatShieldRemaining: 1,
        isAblating: false, isThermalCritical: false, engineState: 'OFF', ignitersRemaining: 3,
        ullageSettled: true, actualThrottle: 0,
        applyPhysics: () => {}, spawnExhaust: () => {}, draw: () => {}, explode: () => {}
    };
    return { ...defaults, ...overrides } as IVessel;
}

/**
 * Test suite for SAS
 */
function runTests() {
    console.log("🧪 Running SAS tests...");

    const sas = new SAS();
    const dt = 0.1;

    // 1. Initialization
    console.log("  - Testing Initialization");
    assert(sas.mode === SASModes.OFF, "Default mode should be OFF");
    assert(sas.update(createMockVessel(), dt) === 0, "Update should return 0 when OFF");
    assert(!sas.isActive(), "Should not be active initially");


    // 2. Stability Mode
    console.log("  - Testing Stability Mode");

    // 2.1 Hold Angle
    const vesselStable = createMockVessel({ angle: 1.0 });
    sas.setMode(SASModes.STABILITY, vesselStable.angle);
    assert(sas.mode === SASModes.STABILITY, "Mode should be STABILITY");
    assert(sas.isActive(), "Should be active in STABILITY mode");

    let output = sas.update(vesselStable, dt);
    assertApprox(output, 0, 0.0001, "Output should be 0 when on target");

    // 2.2 Correct Drift (Positive Error - Overshoot)
    // Target = 1.0, Current = 1.1 (Drifted +0.1).
    // We want to return to 1.0, so we need to rotate NEGATIVE (CW).
    vesselStable.angle = 1.1;
    output = sas.update(vesselStable, dt);
    assert(output < 0, "Should apply negative correction (CW) to correct positive drift");

    // 2.3 Correct Drift (Negative Error - Undershoot)
    // Target = 1.0, Current = 0.9 (Drifted -0.1).
    // We want to return to 1.0, so we need to rotate POSITIVE (CCW).
    vesselStable.angle = 0.9;
    output = sas.update(vesselStable, dt);
    assert(output > 0, "Should apply positive correction (CCW) to correct negative drift");


    // 3. Prograde Mode
    console.log("  - Testing Prograde Mode");

    // 3.1 Standard Prograde
    // Velocity: (0, -100) -> Moving Up. Angle 0.
    const vesselPro = createMockVessel({ vx: 0, vy: -100, angle: 0.1 });
    sas.setMode(SASModes.PROGRADE, 0); // Seed angle doesn't matter for high speed

    // Target should be 0 (Up). Current is 0.1. Error -0.1.
    // Should correct negatively to align with 0.
    output = sas.update(vesselPro, dt);
    assert(output < 0, "Prograde should align with velocity vector");

    // 3.2 Prograde Wrapping
    // Velocity: (100, 0) -> Moving Right. Angle PI/2 (approx 1.57).
    // Current Angle: -PI/2 (approx -1.57).
    // Shortest path is through 0? No.
    // PI/2 - (-PI/2) = PI. Exactly opposite.
    // Let's try: Velocity (-1, 0) -> Left -> -PI/2 (-1.57) NO, atan2(-1, 0) is PI or -PI.
    // Let's use simpler values.
    // Velocity: (1, 1). Angle -3PI/4 (-2.356). No, atan2(1, -1) = 3PI/4 (2.356).
    // Wait, screen coords: Y is down.
    // V = (1, 1) -> Down-Right.
    // atan2(vx, -vy) -> atan2(1, -1) = 2.356 rad (135 deg). Correct.

    const vesselProWrap = createMockVessel({ vx: 1, vy: 1, angle: -3.0 });
    // Target = 2.356. Current = -3.0.
    // Error = 2.356 - (-3.0) = 5.356.
    // Wrap: 5.356 - 2PI = -0.927 (Negative).
    // This means we are "ahead" of target (if moving positive), or just need to subtract angle.
    // We need to rotate NEGATIVE (CW) to reach target.
    sas.setMode(SASModes.PROGRADE, 0);
    output = sas.update(vesselProWrap, dt);
    assert(output < 0, "Prograde should use shortest path wrapping (CW rotation)");

    // 3.3 Low Velocity Fallback
    // If speed < 1m/s, it should use the LAST target angle (or default if not set).
    console.log("    - Testing Low Velocity Fallback (Unseeded)");
    const vesselSlow = createMockVessel({ vx: 0, vy: 0.5, angle: 1.0 }); // Speed 0.5

    // We create a fresh SAS. Target defaults to 0.
    const sasFresh = new SAS();
    sasFresh.setMode(SASModes.PROGRADE, 1.0); // Passing 1.0 but it's ignored by setMode logic for Prograde!

    // Target remains 0 (default). Current is 1.0.
    // Expected behavior: Tries to align to 0. Error = 0 - 1.0 = -1.0. Output < 0.
    output = sasFresh.update(vesselSlow, dt);
    assert(output < 0, "Should default to 0 target if not seeded and speed is low");

    console.log("    - Testing Low Velocity Fallback (Seeded)");
    // Now we seed it properly via Stability mode first
    sas.setMode(SASModes.STABILITY, 1.0);
    sas.setMode(SASModes.PROGRADE, 1.0); // Switch to Prograde

    // Now target should be 1.0. Current is 1.0. Output ~0.
    output = sas.update(vesselSlow, dt);
    assertApprox(output, 0, 0.0001, "Should hold seeded target angle when speed is low");

    // 4. Retrograde Mode
    console.log("  - Testing Retrograde Mode");

    // Velocity: (0, -100) -> Up. Angle 0.
    // Retrograde: Down. Angle PI (3.14159).
    const vesselRetro = createMockVessel({ vx: 0, vy: -100, angle: 0 });
    sas.setMode(SASModes.RETROGRADE, 0);

    // Target = PI. Current = 0. Error = PI.
    // Output should be non-zero to turn around.
    output = sas.update(vesselRetro, dt);
    assert(Math.abs(output) > 0, "Retrograde should target opposite of velocity");

    // Verify it doesn't flip flop at exactly PI error (though floating point usually avoids this)
    // If error is exactly PI, wrapping might go either way (-PI or PI).
    // Just ensure it's stable-ish.


    // 5. Angle Wrapping Boundary Conditions
    console.log("  - Testing Angle Wrapping Logic");
    sas.setMode(SASModes.STABILITY, Math.PI); // Target PI

    // Case 1: Current = -PI + epsilon (just below -PI boundary)
    // -PI + 0.1 = -3.04.
    // Target = 3.14.
    // Diff = 3.14 - (-3.04) = 6.18.
    // Wrap: 6.18 - 2PI = -0.1 (Negative).
    // Shortest path is small negative rotation (to -PI).
    let vesselWrap = createMockVessel({ angle: -Math.PI + 0.1 });
    output = sas.update(vesselWrap, dt);
    assert(output < 0, "Should wrap correctly near PI/-PI boundary (CW rotation)");


    // 6. Robustness & Edge Cases
    console.log("  - Testing Robustness & Edge Cases");

    // 6.1 dt = 0
    // PID controller handles dt=0 safely (returns previous output or proportional only).
    // SAS should just pass it through.
    const vesselRobust = createMockVessel({ angle: 0.1 });
    sas.setMode(SASModes.STABILITY, 0);
    output = sas.update(vesselRobust, 0);
    assert(!isNaN(output), "Output should be valid when dt=0");

    // 6.2 dt < 0
    output = sas.update(vesselRobust, -0.1);
    assert(!isNaN(output), "Output should be valid when dt<0");

    // 6.3 NaN Inputs
    // If vessel has NaN velocity, speed calculation becomes NaN.
    // If speed is NaN, comparison `speed > 1` is false.
    // Falls back to `targetAngle`.
    const vesselNaN = createMockVessel({ vx: NaN, vy: NaN, angle: 0 });
    sas.setMode(SASModes.PROGRADE, 0);
    // Should behave like low velocity (hold target 0).
    // Current 0, Target 0. Output 0.
    output = sas.update(vesselNaN, dt);
    assertApprox(output, 0, 0.0001, "Should handle NaN velocity gracefully");


    // 7. Output Clamping
    console.log("  - Testing Output Clamping");
    const vesselClamp = createMockVessel({ angle: 0 });
    sas.setMode(SASModes.STABILITY, Math.PI); // Target PI (huge error)

    // Error = PI. PID output will be huge.
    // Should clamp to maxGimbal (0.5).
    output = sas.update(vesselClamp, dt);
    assertApprox(Math.abs(output), 0.5, 0.0001, "Output should be clamped to maxGimbal (0.5)");


    console.log("✅ All SAS tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
