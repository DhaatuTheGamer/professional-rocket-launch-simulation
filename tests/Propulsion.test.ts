
import {
    createInitialPropulsionState,
    updatePropulsionState,
    updateUllageStatus,
    attemptIgnition,
    commandShutdown,
    FULLSTACK_PROP_CONFIG,
    type PropulsionState,
    type PropulsionConfig,
    getEngineStateDisplay,
    getIgnitionFailureMessage
} from '../src/physics/Propulsion.ts';

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
 * Test suite for Propulsion System
 */
function runTests() {
    console.log("🧪 Running Propulsion tests...");

    // 1. Initialization
    console.log("  - Testing Initialization");
    const state = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);
    assert(state.engineState === 'off', "Initial state should be 'off'");
    assert(state.ignitersRemaining === FULLSTACK_PROP_CONFIG.igniterCount, "Should start with full igniters");
    assert(state.ullageSettled === true, "Should start settled (on ground)");

    // 2. Ullage Logic
    console.log("  - Testing Ullage Logic");
    let testState = { ...state };

    // Simulate zero-g / freefall (accel = 0)
    // Should unsettle over time
    // settle time is 0.5s. Unsettles at 2x rate -> 0.25s to unsettle?
    // wait, logic is: newState.ullageTimer = Math.max(0, newState.ullageTimer - dt * 2);
    // Initial ullageTimer is 0. Wait, if ullageSettled is true, ullageTimer doesn't matter?
    // Let's check updateUllageStatus implementation.
    // if (currentAcceleration >= config.minUllageAccel) {
    //    newState.ullageTimer += dt;
    //    if (newState.ullageTimer >= config.ullageSettleTime) newState.ullageSettled = true;
    // } else {
    //    newState.ullageTimer = Math.max(0, newState.ullageTimer - dt * 2);
    //    if (newState.ullageTimer <= 0) newState.ullageSettled = false;
    // }

    // Initial state: ullageSettled=true, ullageTimer=0.
    // If I pass accel=0, it goes to else block.
    // ullageTimer becomes 0.
    // if (ullageTimer <= 0) ullageSettled = false.
    // So it should unsettle immediately?

    // Let's test this behavior.
    testState = updateUllageStatus(testState, FULLSTACK_PROP_CONFIG, 0, 0.1);
    assert(testState.ullageSettled === false, "Should unsettle immediately in freefall if timer was 0");

    // Now settle it back
    // minUllageAccel = 0.1
    // settleTime = 0.5
    // step 0.1s. Needs 5 steps.
    for (let i = 0; i < 5; i++) {
        testState = updateUllageStatus(testState, FULLSTACK_PROP_CONFIG, 1.0, 0.1);
    }
    // timer should be 0.5. ullageSettled should be true.
    assert(testState.ullageSettled === true, "Should settle after sufficient time under acceleration");

    // Now unsettle slowly?
    // timer is at 0.5.
    // accel = 0.
    // dt = 0.1.
    // timer -= 0.2. -> 0.3. Still settled.
    testState = updateUllageStatus(testState, FULLSTACK_PROP_CONFIG, 0, 0.1);
    assert(testState.ullageSettled === true, "Should remain settled for a short time in freefall");

    // 3 more steps (0.3 -> 0.1 -> -0.1)
    testState = updateUllageStatus(testState, FULLSTACK_PROP_CONFIG, 0, 0.1); // 0.1
    testState = updateUllageStatus(testState, FULLSTACK_PROP_CONFIG, 0, 0.1); // 0.0 -> unsettles
    assert(testState.ullageSettled === false, "Should unsettle after grace period");


    // 3. Ignition Logic
    console.log("  - Testing Ignition Logic");

    // Reset state
    testState = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);

    // A. No Fuel
    let result = attemptIgnition(testState, FULLSTACK_PROP_CONFIG, false); // hasFuel=false
    assert(result.engineState === 'off', "Should not ignite without fuel");
    assert(result.lastIgnitionResult === 'no_fuel', "Should report no_fuel");

    // B. No Ullage
    testState.ullageSettled = false;
    result = attemptIgnition(testState, FULLSTACK_PROP_CONFIG, true);
    assert(result.engineState === 'off', "Should not ignite without ullage");
    assert(result.lastIgnitionResult === 'no_ullage', "Should report no_ullage");
    testState.ullageSettled = true; // Reset

    // C. No Igniters
    testState.ignitersRemaining = 0;
    result = attemptIgnition(testState, FULLSTACK_PROP_CONFIG, true);
    assert(result.engineState === 'off', "Should not ignite without igniters");
    assert(result.lastIgnitionResult === 'no_igniters', "Should report no_igniters");
    testState.ignitersRemaining = 3; // Reset

    // D. Success
    result = attemptIgnition(testState, FULLSTACK_PROP_CONFIG, true);
    assert(result.engineState === 'starting', "Should ignite when conditions met");
    assert(result.ignitersRemaining === 2, "Should consume an igniter");
    assert(result.lastIgnitionResult === 'success', "Should report success");


    // 4. State Transitions (Full Cycle)
    console.log("  - Testing State Transitions (Off -> Start -> Run -> Shutdown -> Off)");

    testState = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);
    // Ensure we have fuel and ullage
    const hasFuel = true;
    const accel = 1.0; // Settled
    const dt = 0.1;

    // OFF -> STARTING
    // Command throttle 100%
    // Frame 1: Transition to starting
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, hasFuel, accel, dt);
    assert(testState.engineState === 'starting', "Should transition to starting on throttle command");
    assert(testState.spoolProgress === 0, "Spool progress should start at 0 (logic runs next frame)");

    // Frame 2: Start spooling
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, hasFuel, accel, dt);
    assert(testState.spoolProgress > 0, "Spool progress should increase in next frame");

    // STARTING -> RUNNING
    // Spool time is 2.0s. We did 0.1s. Need 1.9s more.
    // 19 steps.
    for (let i = 0; i < 20; i++) {
        testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, hasFuel, accel, dt);
        if (testState.engineState === 'running') break;
    }
    assert(testState.engineState === 'running', "Should transition to running after spool up");
    assert(testState.spoolProgress >= 1, "Spool progress should be 1");
    assert(testState.actualThrottle > 0.9, "Throttle should be ramping up"); // Lag might prevent exactly 1.0 immediately?

    // RUNNING
    // Run for a bit
    const burnTimeStart = testState.totalBurnTime;
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, hasFuel, accel, dt);
    assert(testState.totalBurnTime > burnTimeStart, "Should track burn time");

    // Throttle Lag Test
    // Command 0.5. Current ~1.0.
    // Use smaller dt to observe lag (dt=0.1 equals lag constant=0.1, causing instant convergence)
    const smallDt = 0.05;
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 0.5, hasFuel, accel, smallDt);
    assert(testState.actualThrottle < 0.99 && testState.actualThrottle > 0.5, "Throttle should lag behind command");

    // RUNNING -> SHUTDOWN
    // Command 0
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 0, hasFuel, accel, dt);
    assert(testState.engineState === 'shutdown', "Should transition to shutdown on zero throttle");

    // SHUTDOWN -> OFF
    // Spool down time 0.5s.
    // 5 steps.
    for (let i = 0; i < 10; i++) {
        testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 0, hasFuel, accel, dt);
        if (testState.engineState === 'off') break;
    }
    assert(testState.engineState === 'off', "Should transition to off after spool down");
    assert(testState.actualThrottle === 0, "Throttle should be 0 when off");


    // 5. Edge Cases
    console.log("  - Testing Edge Cases");

    // Flameout
    testState = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);
    // Start engine
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, true, 1.0, dt); // Starting
    // Fast forward to running
    testState.engineState = 'running';
    testState.actualThrottle = 1.0;

    // Cut fuel
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, false, 1.0, dt);
    assert(testState.engineState === 'off', "Should flameout (off) when fuel runs out");
    assert(testState.actualThrottle === 0, "Throttle should cut instantly on flameout");

    // Aborted Start
    testState = createInitialPropulsionState(FULLSTACK_PROP_CONFIG);
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 1.0, true, 1.0, dt); // Starting
    assert(testState.engineState === 'starting', "Engine should be starting");

    // Cut throttle during start
    testState = updatePropulsionState(testState, FULLSTACK_PROP_CONFIG, 0, true, 1.0, dt);
    assert(testState.engineState === 'off', "Should abort to off if throttle cut during start");
    assert(testState.spoolProgress === 0, "Spool progress should reset");

    // 6. Display Helpers
    console.log("  - Testing Display Helpers");
    testState.engineState = 'running';
    assert(getEngineStateDisplay(testState) === 'RUNNING', "Should display RUNNING");

    testState.engineState = 'starting';
    testState.spoolProgress = 0.5;
    assert(getEngineStateDisplay(testState).includes('50%'), "Should display spool progress");

    testState.lastIgnitionResult = 'no_fuel';
    assert(getIgnitionFailureMessage(testState)?.includes('No fuel'), "Should display no fuel message");

    console.log("✅ All Propulsion tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
