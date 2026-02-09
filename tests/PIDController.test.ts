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

    console.log("✅ All PIDController tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    process.exit(1);
}
