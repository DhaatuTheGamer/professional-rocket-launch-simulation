import {
    parseScriptLine,
    parseMissionScript,
    resetScript,
    serializeScript,
    deserializeScript,
    type MissionScript,
    type ScriptCommand,
    type ParseResult
} from '../src/guidance/FlightScript.ts';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

function runTests() {
    console.log("🧪 Running FlightScript tests...");

    // 1. parseScriptLine
    console.log("  - Testing parseScriptLine");

    // Valid: Basic
    const r1 = parseScriptLine("WHEN ALTITUDE > 1000 THEN STAGE", 1);
    assert(r1.success, "Should parse valid basic command");
    assert(r1.command?.condition.clauses[0].variable === 'ALTITUDE', "Variable should be ALTITUDE");
    assert(r1.command?.condition.clauses[0].operator === '>', "Operator should be >");
    assert(r1.command?.condition.clauses[0].value === 1000, "Value should be 1000");
    assert(r1.command?.action.type === 'STAGE', "Action should be STAGE");
    assert(r1.command?.oneShot === true, "STAGE should be oneShot");

    // Valid: Complex Condition (AND)
    const r2 = parseScriptLine("WHEN VELOCITY > 2000 AND ALTITUDE > 50000 THEN PITCH 45", 2);
    assert(r2.success, "Should parse complex AND condition");
    assert(r2.command?.condition.clauses.length === 2, "Should have 2 clauses");
    assert(r2.command?.condition.logicalOperators[0] === 'AND', "Logical operator should be AND");
    assert(r2.command?.action.type === 'PITCH', "Action should be PITCH");
    assert(r2.command?.action.value === 45, "Pitch value should be 45");

    // Valid: Complex Condition (OR)
    const r3 = parseScriptLine("WHEN FUEL < 0.1 OR TIME > 300 THEN ABORT", 3);
    assert(r3.success, "Should parse complex OR condition");
    assert(r3.command?.condition.logicalOperators[0] === 'OR', "Logical operator should be OR");
    assert(r3.command?.action.type === 'ABORT', "Action should be ABORT");

    // Valid: Throttle Normalization
    const r4 = parseScriptLine("WHEN TIME == 10 THEN THROTTLE 100", 4);
    assert(r4.success, "Should parse THROTTLE 100");
    assert(r4.command?.action.value === 1, "Throttle 100 should normalize to 1");

    const r5 = parseScriptLine("WHEN TIME == 10 THEN THROTTLE 0.5", 5);
    assert(r5.success, "Should parse THROTTLE 0.5");
    assert(r5.command?.action.value === 0.5, "Throttle 0.5 should remain 0.5");

    // Valid: SAS Modes
    const r6 = parseScriptLine("WHEN ALTITUDE > 70000 THEN SAS PROGRADE", 6);
    assert(r6.success, "Should parse SAS PROGRADE");
    assert(r6.command?.action.type === 'SAS', "Action should be SAS");
    assert(r6.command?.action.value === 'PROGRADE', "SAS value should be PROGRADE");

    // Edge Cases: Comments and Empty Lines
    const r7 = parseScriptLine("// This is a comment", 7);
    assert(r7.success, "Comment should be valid");
    assert(r7.command === undefined, "Comment should produce no command");

    const r8 = parseScriptLine("   ", 8);
    assert(r8.success, "Empty line should be valid");
    assert(r8.command === undefined, "Empty line should produce no command");

    // Invalid: Syntax
    const r9 = parseScriptLine("INVALID LINE", 9);
    assert(!r9.success, "Invalid syntax should fail");
    assert(r9.error !== undefined && r9.error.includes("Invalid syntax"), "Should report syntax error");

    const r10 = parseScriptLine("WHEN ALTITUDE > 1000", 10);
    assert(!r10.success, "Missing action should fail");

    const r11 = parseScriptLine("WHEN UNKNOWN_VAR > 10 THEN STAGE", 11);
    assert(!r11.success, "Invalid variable should fail");
    assert(r11.error !== undefined && r11.error.includes("Invalid condition"), "Should report invalid condition");

    const r12 = parseScriptLine("WHEN ALTITUDE > 1000 THEN UNKNOWN_ACTION", 12);
    assert(!r12.success, "Invalid action should fail");
    assert(r12.error !== undefined && r12.error.includes("Invalid action"), "Should report invalid action");

    // 2. parseMissionScript
    console.log("  - Testing parseMissionScript");

    const scriptText = `
        // Launch Sequence
        WHEN ALTITUDE > 1000 THEN PITCH 80
        WHEN VELOCITY > 500 THEN THROTTLE 60

        # Staging
        WHEN FUEL < 0.01 THEN STAGE
    `;

    const scriptResult = parseMissionScript(scriptText, "Test Mission");
    assert(scriptResult.success, "Should parse valid multi-line script");
    assert(scriptResult.script?.name === "Test Mission", "Should set script name");
    assert(scriptResult.script?.commands.length === 3, `Should find 3 commands, got ${scriptResult.script?.commands.length}`);
    assert(scriptResult.script?.commands[0].action.type === 'PITCH', "First command should be PITCH");
    assert(scriptResult.script?.commands[2].action.type === 'STAGE', "Third command should be STAGE");

    // Script with errors
    const errorScriptText = `
        WHEN ALTITUDE > 1000 THEN PITCH 80
        INVALID LINE
        WHEN FUEL < 0.01 THEN STAGE
    `;
    const errorResult = parseMissionScript(errorScriptText);
    assert(!errorResult.success, "Should fail script with errors");
    assert(errorResult.errors.length === 1, "Should report 1 error");
    // Line 1: Empty
    // Line 2: WHEN...
    // Line 3: INVALID...
    assert(errorResult.errors[0].line === 3, `Error should be on line 3, got ${errorResult.errors[0].line}`);


    // 3. resetScript
    console.log("  - Testing resetScript");

    // Create a dummy script with completed commands
    const s1 = parseMissionScript("WHEN ALTITUDE > 1000 THEN STAGE").script!;
    s1.commands[0].state = 'completed';

    resetScript(s1);
    assert(s1.commands[0].state === 'pending', "Command should be reset to pending");


    // 4. Serialization
    console.log("  - Testing Serialization");

    const original = parseMissionScript("WHEN ALTITUDE > 1000 THEN STAGE", "My Script").script!;
    const json = serializeScript(original);
    const restored = deserializeScript(json);

    assert(restored !== null, "Deserialization should succeed");
    assert(restored?.name === original.name, "Name should match");
    assert(restored?.commands.length === original.commands.length, "Command count should match");
    assert(restored?.commands[0].rawText === original.commands[0].rawText, "Raw text should match");
    assert(restored?.commands[0].condition.clauses[0].variable === 'ALTITUDE', "Variable should match");

    console.log("✅ All FlightScript tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
