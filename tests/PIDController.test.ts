import { PIDController } from '../src/utils/PIDController.ts';

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
 * Test suite for PIDController
 */
function runTests() {
    console.log("🧪 Running PIDController tests...");

    // 1. Normal Operation
    console.log("  - Testing normal operation (dt > 0)");
    const pid = new PIDController(1, 1, 1, 10); // kp=1, ki=1, kd=1, setpoint=10

    // First update
    // error = 10 - 0 = 10
    // dt = 0.1
    // integral = 0 + 10 * 0.1 = 1
    // derivative = (10 - 0) / 0.1 = 100
    // output = 1*10 + 1*1 + 1*100 = 111
    let output = pid.update(0, 0.1);
    assert(output === 111, `Expected 111, got ${output}`);

    // 2. Division by Zero Protection
    console.log("  - Testing division by zero protection (dt = 0)");
    // error = 10 - 5 = 5
    // dt = 0
    // integral should not change (remains 1)
    // derivative should be 0
    // lastError updated to 5
    // output = 1*5 + 1*1 + 1*0 = 6
    output = pid.update(5, 0);
    assert(output === 6, `Expected 6, got ${output}`);
    assert(!isNaN(output), "Output should not be NaN when dt=0");

    // 3. Negative Time Delta Protection
    console.log("  - Testing negative time delta (dt < 0)");
    // error = 10 - 2 = 8
    // dt = -0.1
    // integral should not change (remains 1)
    // derivative should be 0
    // lastError updated to 8
    // output = 1*8 + 1*1 + 1*0 = 9
    output = pid.update(2, -0.1);
    assert(output === 9, `Expected 9, got ${output}`);
    assert(!isNaN(output), "Output should not be NaN when dt < 0");

    // 4. Recovery after Bad Time Delta
    console.log("  - Testing recovery after bad time delta");
    // Previous error was 8 (from test case 3)
    // Current measurement = 4
    // error = 10 - 4 = 6
    // dt = 0.1
    // integral = 1 + 6 * 0.1 = 1.6
    // derivative = (6 - 8) / 0.1 = -20
    // output = 1*6 + 1*1.6 + 1*(-20) = 7.6 - 20 = -12.4
    output = pid.update(4, 0.1);
    assert(Math.abs(output - (-12.4)) < 0.000001, `Expected -12.4, got ${output}`);

    // 5. Very Small Time Delta
    console.log("  - Testing very small time delta");
    // Previous error was 6
    // measurement = 6
    // error = 10 - 6 = 4
    // dt = 1e-10
    // derivative = (4 - 6) / 1e-10 = -2 / 1e-10 = -20,000,000,000
    // integral = 1.6 + 4 * 1e-10 ≈ 1.6
    // output ≈ 4 + 1.6 - 20,000,000,000 ≈ -19,999,999,994.4
    output = pid.update(6, 1e-10);
    assert(!isNaN(output) && isFinite(output), "Output should be a finite number even with very small dt");
    console.log(`    Small dt output: ${output}`);

    // 6. Reset functionality
    console.log("  - Testing reset()");
    pid.reset();
    // After reset, integral = 0, lastError = 0
    // error = 10 - 0 = 10
    // dt = 0.1
    // integral = 1
    // derivative = 100
    // output = 111
    output = pid.update(0, 0.1);
    assert(output === 111, `Expected 111 after reset, got ${output}`);

    // 7. Additional Edge Cases (NaN, Epsilon)
    console.log("  - Testing additional edge cases");
    const pidEdge = new PIDController(1, 1, 1, 10);
    pidEdge.update(0, 0.1); // int=1, lastErr=10

    // NaN
    let outEdge = pidEdge.update(5, NaN);
    assert(outEdge === 6, `Expected output 6 for dt=NaN, got ${outEdge}`);
    assert(!isNaN(outEdge), "Output should not be NaN");

    // Recovery from NaN
    outEdge = pidEdge.update(8, 0.1);
    // int=1 + 2*0.1 = 1.2
    // deriv=(2-5)/0.1 = -30
    // out = 1*2 + 1*1.2 - 30 = -26.8
    assert(Math.abs(outEdge - (-26.8)) < 0.000001, `Recovery from NaN failed. Expected -26.8, got ${outEdge}`);

    // Epsilon
    const pidEps = new PIDController(1, 1, 1, 10);
    pidEps.update(0, 0.1); // int=1, lastErr=10
    outEdge = pidEps.update(5, Number.EPSILON);
    assert(isFinite(outEdge), `Output should be finite for dt=EPSILON, got ${outEdge}`);

    // 8. Integral Clamping
    console.log("  - Testing Integral Clamping");
    const pidClamp = new PIDController(0, 1, 0, 0); // Only Integral term active

    // Increase integral to 10
    // setpoint=0, measurement=-100 -> error=100
    // dt=0.1 -> integral += 100 * 0.1 = 10
    pidClamp.update(-100, 0.1);

    // Clamp to [0, 5]
    pidClamp.clampIntegral(0, 5);

    // Check next update (with 0 error to avoid changing integral)
    // output = 1 * integral
    output = pidClamp.update(0, 0.1);
    assert(Math.abs(output - 5) < 0.0001, `Expected clamped integral 5, got ${output}`);

    // Clamp to [-2, 2]
    pidClamp.clampIntegral(-2, 2);
    output = pidClamp.update(0, 0.1);
    assert(Math.abs(output - 2) < 0.0001, `Expected clamped integral 2, got ${output}`);

    // 9. Dynamic Reconfiguration
    console.log("  - Testing Dynamic Reconfiguration");
    const pidConfig = new PIDController(1, 0, 0, 10); // Proportional only

    // error = 10 - 0 = 10. Output = 10.
    output = pidConfig.update(0, 0.1);
    assert(output === 10, "Initial proportional output correct");

    // Change Kp
    pidConfig.kp = 2;
    // error = 10 - 0 = 10. Output = 20.
    output = pidConfig.update(0, 0.1);
    assert(output === 20, "Output updated after Kp change");

    // Change setpoint
    pidConfig.setpoint = 20;
    // error = 20 - 0 = 20. Output = 40.
    output = pidConfig.update(0, 0.1);
    assert(output === 40, "Output updated after setpoint change");

    // 10. Infinity handling
    console.log("  - Testing Infinity handling");
    const pidInf = new PIDController(1, 1, 1, 10);
    // dt = Infinity
    // error = 10 - 0 = 10
    // integral += 10 * Infinity = Infinity
    // derivative = (10 - 0) / Infinity = 0
    // output = 10 + Infinity + 0 = Infinity
    output = pidInf.update(0, Infinity);
    assert(output === Infinity, "Output should be Infinity when dt=Infinity");

    console.log("✅ All PIDController tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    process.exit(1);
}
