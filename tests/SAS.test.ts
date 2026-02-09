
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

    // 2. Stability Mode (Basic)
    console.log("  - Testing Stability Mode (Basic)");
    const vesselBasic = createMockVessel(1.0);
    sas.setMode(SASModes.STABILITY, vesselBasic.angle);

    // Check maintenance of angle
    let output = sas.update(vesselBasic, 0.1);
    // Since we are exactly on target, error is 0, output should be 0 (or close due to float precision)
    assert(Math.abs(output) < 0.0001, `Expected near 0 output on target, got ${output}`);

    // Check correction
    vesselBasic.angle = 1.1; // Drifted +0.1
    output = sas.update(vesselBasic, 0.1);
    // Error = 1.0 - 1.1 = -0.1. PID should output negative value to correct positive drift?
    // Wait: setpoint=1.0. measurement=1.1. error = -0.1.
    // PID update(-error) -> update(0.1).
    // Kp * 0.1 = positive output?
    // If output is positive gimbal, does it correct positive angle drift?
    // Usually positive gimbal -> creates torque to reduce angle? It depends on sign convention.
    // Let's assume standard control logic:
    // If angle is too high (1.1 > 1.0), we want to reduce it.
    // So we need negative torque.
    // Let's see SAS implementation:
    // pid.update(-error). Error is -0.1. -error is 0.1.
    // PID output is positive.
    // So positive gimbal -> negative torque?
    // I won't assert sign here without knowing physics engine sign convention,
    // but I will assert it's non-zero.
    assert(Math.abs(output) > 0.1, "Should produce output when off target");


    // 3. Angle Wrapping (The Core Test)
    console.log("  - Testing Angle Wrapping (0/2π Boundary)");

    // Case A: Crossing 0 from below (negative angle) vs from above (positive large angle)
    // Target = 0.
    vesselBasic.angle = 0;
    sas.setMode(SASModes.STABILITY, 0);

    // Vessel at 355 degrees (approx 6.2 rad). Target is 0 (approx 6.28 rad).
    // Shortest path is +5 degrees.
    // Raw error: 0 - 6.2 = -6.2.
    // Wrapped error: -6.2 + 2PI ≈ +0.08.
    // Correct behavior: Treat as small positive error -> Positive PID input -> Positive Output.
    // Incorrect behavior: Treat as large negative error -> Negative Output.

    const vesselWrap = createMockVessel(6.2); // ~355 degrees
    output = sas.update(vesselWrap, 0.1);

    console.log(`    Target: 0, Current: 6.2 (~355°). Output: ${output}`);

    // If wrapping works, error is small positive (~0.08). PID output should be positive.
    // If wrapping fails, error is large negative (~-6.2). PID output should be negative (saturated).
    assert(output > 0, "SAS should wrap angle across 0/2π boundary (Expected Positive Output)");


    console.log("  - Testing Angle Wrapping (π/-π Boundary)");
    // Case B: Crossing +/- PI.
    // Target = 3.0 (approx 172 deg).
    // Vessel = -3.0 (approx -172 deg).
    // Distance = 6.0.
    // Shortest path: Go from -172 to +172 is 16 degrees? No wait.
    // -172 to +172 is 344 degrees the long way.
    // Shortest path is across +/- 180 line.
    // 172 is 8 degrees from 180. -172 is 8 degrees from -180.
    // Total distance = 16 degrees.
    // Direction: To go from -3.0 to 3.0 via 180:
    // -3.0 -> decrease (more negative) -> crosses -PI/PI boundary -> becomes positive -> 3.0.
    // So we want 'negative' velocity?

    // Let's calculate:
    // Setpoint = 3.0.
    // Vessel = -3.0.
    // Raw Error = 3.0 - (-3.0) = 6.0.
    // Wrapped: 6.0 is < PI (3.14)? No. 6.0 > PI.
    // While (error > PI) error -= 2PI.
    // 6.0 - 6.28 = -0.28.
    // So wrapped error is negative.
    // PID Update(-(-0.28)) = Update(0.28).
    // Output should be positive.

    // Wait. If error is negative (-0.28), it means "Target is behind you (negative direction)".
    // So we should turn negative?
    // Error = Setpoint - Process.
    // If Error is negative, Process > Setpoint. We need to reduce Process.
    // So we need negative control.

    // SAS Implementation: `this.pid.update(-error, dt)`.
    // Passes `-error` as measurement? No, `setpoint=0`.
    // `pid.update(measurement, dt)`.
    // internal_error = 0 - measurement = 0 - (-error) = error.
    // So PID sees `error`.
    // If error is negative (-0.28), PID output should be negative.

    // Let's re-verify:
    // Target 3.0. Current -3.0.
    // If I turn positive (increase angle): -3.0 -> -2.0 -> ... -> 0 -> 3.0. Delta = 6.0. Long way.
    // If I turn negative (decrease angle): -3.0 -> -3.1 -> (wrap) -> 3.1 -> 3.0. Delta = 0.28. Short way.
    // So I should turn negative.
    // So Output should be negative.

    // Let's check my manual calculation:
    // Raw Error = 6.0.
    // Wrapped Error = -0.28.
    // PID sees -0.28.
    // PID Output should be negative.

    // If wrapping failed:
    // Error = 6.0.
    // PID sees 6.0.
    // PID Output positive.

    // So checking output < 0 confirms wrapping.

    const vesselPi = createMockVessel(-3.0);
    sas.setMode(SASModes.STABILITY, 3.0); // Target 3.0
    // Note: setMode sets target to current angle. We need to manually set target?
    // SAS.ts: setMode(STABILITY) sets target = currentAngle.
    // But we want to test specific target.
    // We can't easily access targetAngle private property.
    // Workaround:
    // 1. Create vessel with angle 3.0.
    // 2. setMode(STABILITY, 3.0). Target = 3.0.
    // 3. Update vessel angle to -3.0.
    // 4. Update SAS.

    const vesselTarget = createMockVessel(3.0);
    sas.setMode(SASModes.STABILITY, vesselTarget.angle); // Target = 3.0

    // Now move vessel to -3.0
    vesselTarget.angle = -3.0;

    output = sas.update(vesselTarget, 0.1);
    console.log(`    Target: 3.0, Current: -3.0. Output: ${output}`);

    assert(output < 0, "SAS should wrap angle across π/-π boundary (Expected Negative Output)");

    // 4. Prograde Mode
    console.log("  - Testing Prograde Mode");
    // Velocity vector (10, 0) -> Angle 0?
    // Math.atan2(vx, -vy) -> atan2(10, 0) = PI/2 (90 deg)?
    // Wait, coordinate system in SAS.ts:
    // setpoint = Math.atan2(vessel.vx, -vessel.vy);
    // Standard atan2(y, x). Here y=vx, x=-vy.
    // This implies specific coordinate system where Up is -Y?
    // Let's assume (vx=0, vy=-10) (Moving Up).
    // atan2(0, -(-10)) = atan2(0, 10) = 0.
    // So Up is 0.

    // Test Case: Moving Up (vy=-10). Target should be 0.
    // Vessel Angle = 0.1.
    // Error = 0 - 0.1 = -0.1.
    // Output should be negative? (To reduce angle back to 0).
    // Let's check.

    const vesselPrograde = createMockVessel(0.1, 0, -100); // Angle 0.1, Velocity Up
    sas.setMode(SASModes.PROGRADE, 0.1); // Mode set, current angle irrelevant for target calculation

    output = sas.update(vesselPrograde, 0.1);
    // Target (Prograde) = 0.
    // Current = 0.1.
    // Error = -0.1.
    // PID sees -0.1.
    // Output negative.
    assert(output < 0, "Prograde should correct drift (Expected Negative Output)");


    console.log("✅ All SAS tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
