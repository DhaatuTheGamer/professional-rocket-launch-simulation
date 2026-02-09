
import { FlightComputer, PRESET_SCRIPTS } from '../src/guidance/FlightComputer.ts';
import { parseMissionScript } from '../src/guidance/FlightScript.ts';

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

    console.log("✅ All FlightComputer tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
