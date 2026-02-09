import { parseScriptLine, parseMissionScript } from '../src/guidance/FlightScript.ts';

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
 * Test suite for FlightScript parser
 */
function runTests() {
    console.log("🧪 Running FlightScript tests...");

    // 1. Test parseScriptLine - Valid Case
    console.log("  - Testing parseScriptLine (Valid)");
    const validLine = "WHEN ALTITUDE > 1000 THEN PITCH 80";
    const validResult = parseScriptLine(validLine, 1);
    assert(validResult.success === true, "Valid line should parse successfully");
    assert(validResult.command?.rawText === validLine, "Raw text should match");
    assert(validResult.command?.condition.clauses[0].variable === 'ALTITUDE', "Variable should be ALTITUDE");
    assert(validResult.command?.action.type === 'PITCH', "Action type should be PITCH");

    // 2. Test parseScriptLine - Invalid Syntax (Missing THEN action)
    console.log("  - Testing parseScriptLine (Missing THEN action)");
    const invalidLine1 = "WHEN ALTITUDE > 1000";
    const invalidResult1 = parseScriptLine(invalidLine1, 2);
    assert(invalidResult1.success === false, "Line missing action should fail parsing");
    assert(invalidResult1.error?.includes("Invalid syntax") ?? false, "Error message should mention 'Invalid syntax'");

    // 3. Test parseScriptLine - Invalid Syntax (Missing WHEN condition)
    console.log("  - Testing parseScriptLine (Missing WHEN condition)");
    const invalidLine2 = "THEN PITCH 80";
    const invalidResult2 = parseScriptLine(invalidLine2, 3);
    assert(invalidResult2.success === false, "Line missing condition should fail parsing");
    assert(invalidResult2.error?.includes("Invalid syntax") ?? false, "Error message should mention 'Invalid syntax'");

    // 4. Test parseScriptLine - Completely Malformed
    console.log("  - Testing parseScriptLine (Malformed)");
    const invalidLine3 = "INVALID SYNTAX";
    const invalidResult3 = parseScriptLine(invalidLine3, 4);
    assert(invalidResult3.success === false, "Malformed line should fail parsing");
    assert(invalidResult3.error?.includes("Invalid syntax") ?? false, "Error message should mention 'Invalid syntax'");

    // 5. Test parseScriptLine - Invalid Syntax (Missing THEN keyword)
    console.log("  - Testing parseScriptLine (Missing THEN keyword)");
    const invalidLine4 = "WHEN ALTITUDE > 1000 PITCH 80";
    const invalidResult4 = parseScriptLine(invalidLine4, 5);
    assert(invalidResult4.success === false, "Line missing THEN keyword should fail parsing");
    assert(invalidResult4.error?.includes("Invalid syntax") ?? false, "Error message should mention 'Invalid syntax'");

    // 6. Test parseMissionScript - Valid Script
    console.log("  - Testing parseMissionScript (Valid)");
    const validScript = `
    // Comment
    WHEN ALTITUDE > 1000 THEN PITCH 80
    WHEN VELOCITY > 2000 THEN STAGE
    `;
    const scriptResult = parseMissionScript(validScript, "Valid Script");
    assert(scriptResult.success === true, "Valid script should parse successfully");
    assert(scriptResult.script?.commands.length === 2, "Script should have 2 commands");

    // 7. Test parseMissionScript - Mixed Script (Valid + Invalid)
    console.log("  - Testing parseMissionScript (Mixed)");
    const mixedScript = `
    WHEN ALTITUDE > 1000 THEN PITCH 80
    INVALID SYNTAX
    `;
    const mixedResult = parseMissionScript(mixedScript, "Mixed Script");
    assert(mixedResult.success === false, "Mixed script should fail parsing");
    assert(mixedResult.errors.length === 1, "Should have 1 error");
    assert(mixedResult.errors[0].error?.includes("Invalid syntax") ?? false, "Error should mention 'Invalid syntax'");

    console.log("✅ All FlightScript tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
