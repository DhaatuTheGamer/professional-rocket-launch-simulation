import { calculateHohmannTransfer, MU } from '../src/physics/OrbitalMechanics.ts';

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
 * Helper to check if two numbers are approximately equal
 */
function assertApprox(actual: number, expected: number, tolerance: number = 1e-6, message: string) {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`❌ Assertion failed: ${message}`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Actual:   ${actual}`);
        console.error(`   Diff:     ${Math.abs(actual - expected)}`);
        throw new Error(message);
    }
}

function runTests() {
    console.log("🧪 Running OrbitalMechanics tests...");

    // Constants for test
    const rEarth = 6371000;

    // Test Case 1: LEO to GTO (Standard Transfer)
    // r1: 300km altitude
    // r2: 35786km altitude (GEO)
    console.log("  - Testing LEO to GEO transfer");
    const r1 = rEarth + 300000;
    const r2 = rEarth + 35786000;
    const thrust = 100000; // 100 kN
    const mass = 5000;     // 5000 kg

    const result = calculateHohmannTransfer(r1, r2, thrust, mass);

    // Manual Calculation check
    // a_transfer = (r1 + r2) / 2
    const aTransfer = (r1 + r2) / 2;
    // v_c1 = sqrt(mu / r1)
    const vc1 = Math.sqrt(MU / r1);
    // v_t1 = sqrt(mu * (2/r1 - 1/a))
    const vt1 = Math.sqrt(MU * (2 / r1 - 1 / aTransfer));
    // dv1 = abs(vt1 - vc1)
    const expectedDv1 = Math.abs(vt1 - vc1);

    // v_c2 = sqrt(mu / r2)
    const vc2 = Math.sqrt(MU / r2);
    // v_t2 = sqrt(mu * (2/r2 - 1/a))
    const vt2 = Math.sqrt(MU * (2 / r2 - 1 / aTransfer));
    // dv2 = abs(vc2 - vt2)
    const expectedDv2 = Math.abs(vc2 - vt2);

    assertApprox(result.deltaV1, expectedDv1, 0.1, "Delta V1 should match theoretical value");
    assertApprox(result.deltaV2, expectedDv2, 0.1, "Delta V2 should match theoretical value");

    // Burn time check: t = (dv * m) / F
    const expectedBurnTime1 = (result.deltaV1 * mass) / thrust;
    assertApprox(result.burnTime1, expectedBurnTime1, 0.1, "Burn time should be consistent with deltaV");

    // Test Case 2: Same Orbit (Zero Transfer)
    console.log("  - Testing same orbit transfer (r1 = r2)");
    const resultSame = calculateHohmannTransfer(r1, r1, thrust, mass);
    assertApprox(resultSame.deltaV1, 0, 1e-9, "Delta V1 should be 0 for same orbit");
    assertApprox(resultSame.deltaV2, 0, 1e-9, "Delta V2 should be 0 for same orbit");
    assertApprox(resultSame.transferTime, Math.PI * Math.sqrt(Math.pow(r1, 3) / MU), 0.1, "Transfer time should be half period");

    // Test Case 3: Higher to Lower Orbit (Return from GEO)
    console.log("  - Testing Higher to Lower orbit (GEO to LEO)");
    const resultReturn = calculateHohmannTransfer(r2, r1, thrust, mass);

    // Should be symmetric in terms of Delta V magnitude
    assertApprox(resultReturn.deltaV1, result.deltaV2, 0.1, "Return Burn 1 should match Outward Burn 2 magnitude");
    assertApprox(resultReturn.deltaV2, result.deltaV1, 0.1, "Return Burn 2 should match Outward Burn 1 magnitude");
    assertApprox(resultReturn.transferTime, result.transferTime, 0.1, "Transfer time should be identical");

    // Test Case 4: Zero Thrust Handling
    console.log("  - Testing Zero Thrust handling");
    const resultZeroThrust = calculateHohmannTransfer(r1, r2, 0, mass);
    // If thrust is 0, code uses Math.max(1, thrust) => 1
    // burnTime = (dv * mass) / 1
    const expectedBurnTimeZero = (resultZeroThrust.deltaV1 * mass) / 1;
    assertApprox(resultZeroThrust.burnTime1, expectedBurnTimeZero, 0.1, "Should handle zero thrust safely");
    assert(!isNaN(resultZeroThrust.burnTime1) && isFinite(resultZeroThrust.burnTime1), "Burn time should be finite");

    console.log("✅ All OrbitalMechanics tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    process.exit(1);
}
