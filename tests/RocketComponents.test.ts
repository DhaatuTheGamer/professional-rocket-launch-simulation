
import {
    FullStack,
    Booster,
    UpperStage,
    Payload,
    Fairing
} from '../src/physics/RocketComponents';
import { state } from '../src/state';
import { PIXELS_PER_METER, GRAVITY } from '../src/constants';

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
 * Test suite for RocketComponents
 */
function runTests() {
    console.log("🧪 Running RocketComponents tests...");

    // 1. Initialization
    console.log("  - Testing Initialization");

    const fullStack = new FullStack(0, 0);
    assert(fullStack.mass > 0, "FullStack should have mass");
    assert(fullStack.propState.engineState === 'off', "FullStack engine should be off");

    const booster = new Booster(0, 0);
    assert(booster.mass > 0, "Booster should have mass");
    assert(booster.fuel > 0, "Booster should have fuel");

    const upperStage = new UpperStage(0, 0);
    assert(upperStage.mass > 0, "UpperStage should have mass");
    assert(!upperStage.fairingsDeployed, "Fairings should not be deployed initially");

    const payload = new Payload(0, 0);
    assert(payload.mass > 0, "Payload should have mass");
    assert(payload.ignitersRemaining === 0, "Payload should have no igniters");

    const fairing = new Fairing(0, 0);
    assert(fairing.active === false, "Fairing should be inactive");

    // 2. Booster Autopilot (Suicide Burn)
    console.log("  - Testing Booster Autopilot (Suicide Burn)");

    // Setup environment
    state.groundY = 5000; // Ground at Y=5000 pixels
    state.autopilotEnabled = true;

    // Create booster high up
    // h=100. So bottom is at y+100.
    // Let's put it at y=0. Alt = (5000 - 0 - 100)/10 = 490m.
    const testBooster = new Booster(0, 0);
    testBooster.active = true;
    testBooster.crashed = false;
    testBooster.fuel = 1.0;

    // Simulate freefall with autopilot
    // Initial velocity downward
    testBooster.vy = 50; // 50 m/s down

    // Check initial throttle (should be 0 as we are high up and not fast enough to crash immediately vs max thrust)
    // Max thrust ~2MN. Mass ~40t. Max accel ~50 m/s^2.
    // Stop dist for 50m/s: v^2 / 2a = 2500 / 100 = 25m.
    // Current alt 490m. 490 > 25 + 100. So throttle should be 0.

    testBooster.applyPhysics(0.1, {});
    assert(testBooster.throttle === 0, `Throttle should be 0 at high altitude (Alt: 490m, StopDist: ~25m). Got ${testBooster.throttle}`);

    // Move closer to ground
    // Let's be at 120m altitude.
    // y = 5000 - 100 - (120 * 10) = 3700.
    testBooster.y = 3700;
    testBooster.vy = 100; // 100 m/s down.
    // Stop dist: 10000 / 100 = 100m.
    // Alt 120m. StopDist 100m.
    // Logic: if (alt < stopDist + 100) -> 120 < 200. Should burn.

    testBooster.applyPhysics(0.1, {});
    assert(testBooster.throttle === 1.0, `Throttle should be 1.0 when approaching stop distance (Alt: 120m, StopDist: ~100m). Got ${testBooster.throttle}`);

    // Terminal Precision Control
    // Alt < 50m.
    // y = 5000 - 100 - (40 * 10) = 4500.
    testBooster.y = 4500; // 40m alt.
    testBooster.vy = 10; // 10 m/s down.
    // Target vel = alt * 0.2 = 40 * 0.2 = 8 m/s.
    // Error = 10 - 8 = 2.
    // Throttle = 0.5 + 2 * 0.2 = 0.9.

    testBooster.applyPhysics(0.1, {});
    assert(testBooster.throttle > 0.5 && testBooster.throttle < 1.0, `Throttle should modulate for precision landing. Got ${testBooster.throttle}`);

    // Touchdown
    // Alt < 1m.
    // y = 5000 - 100 - (0.5 * 10) = 4895.
    testBooster.y = 4895;
    testBooster.applyPhysics(0.1, {});
    assert(testBooster.throttle === 0, `Throttle should be 0 at touchdown. Got ${testBooster.throttle}`);


    // 3. Booster Tilt Control
    console.log("  - Testing Booster Tilt Control");

    const tiltBooster = new Booster(0, 0);
    tiltBooster.active = true;
    state.autopilotEnabled = true;

    // Tilt it
    tiltBooster.angle = 0.1; // Tilted right
    tiltBooster.applyPhysics(0.1, {});

    // PID Controller (-5.0, 0.0, -50.0)
    // Target 0. Error -0.1.
    // P-term: -0.1 * -5.0 = 0.5.
    // Output 0.5.
    // Clamped to [-0.4, 0.4]. So 0.4.

    assert(tiltBooster.gimbalAngle > 0, `Gimbal should deflect positive to correct positive tilt. Got ${tiltBooster.gimbalAngle}`);
    assert(Math.abs(tiltBooster.gimbalAngle - 0.4) < 0.001, `Gimbal should hit max deflection 0.4. Got ${tiltBooster.gimbalAngle}`);

    // Tilt other way
    tiltBooster.angle = -0.1;
    // Reset PID state roughly (create new booster to be clean)
    const tiltBooster2 = new Booster(0, 0);
    tiltBooster2.active = true;
    tiltBooster2.angle = -0.1;

    tiltBooster2.applyPhysics(0.1, {});
    assert(tiltBooster2.gimbalAngle < 0, `Gimbal should deflect negative to correct negative tilt. Got ${tiltBooster2.gimbalAngle}`);

    console.log("✅ All RocketComponents tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
