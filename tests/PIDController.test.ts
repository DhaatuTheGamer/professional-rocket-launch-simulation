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

    // 8. Isolated P Term
    console.log("  - Testing P term only");
    // kp=2, ki=0, kd=0, setpoint=10
    const pidP = new PIDController(2, 0, 0, 10);
    // error = 10 - 5 = 5
    // output = 2 * 5 = 10
    let outP = pidP.update(5, 0.1);
    assert(outP === 10, `Expected P output 10, got ${outP}`);

    // 9. Isolated I Term
    console.log("  - Testing I term only");
    // kp=0, ki=2, kd=0, setpoint=10
    const pidI = new PIDController(0, 2, 0, 10);
    // First update: error=5, dt=0.1 -> integral += 5*0.1 = 0.5
    // output = 2 * 0.5 = 1
    let outI = pidI.update(5, 0.1);
    assert(Math.abs(outI - 1) < 0.000001, `Expected I output 1, got ${outI}`);

    // Second update: error=5, dt=0.1 -> integral += 5*0.1 = 1.0 (accumulated)
    // output = 2 * 1.0 = 2
    outI = pidI.update(5, 0.1);
    assert(Math.abs(outI - 2) < 0.000001, `Expected I output 2, got ${outI}`);

    // 10. Isolated D Term
    console.log("  - Testing D term only");
    // kp=0, ki=0, kd=0.5, setpoint=10
    const pidD = new PIDController(0, 0, 0.5, 10);
    // First update: error=5, lastError=0, dt=0.1
    // derivative = (5 - 0) / 0.1 = 50
    // output = 0.5 * 50 = 25
    let outD = pidD.update(5, 0.1);
    assert(Math.abs(outD - 25) < 0.000001, `Expected D output 25, got ${outD}`);

    // Second update: measurement=8 -> error=2
    // lastError=5
    // derivative = (2 - 5) / 0.1 = -30
    // output = 0.5 * -30 = -15
    outD = pidD.update(8, 0.1);
    assert(Math.abs(outD - (-15)) < 0.000001, `Expected D output -15, got ${outD}`);

    console.log("✅ All PIDController tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    process.exit(1);
}
