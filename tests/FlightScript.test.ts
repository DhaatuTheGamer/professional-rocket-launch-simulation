
import { parseMissionScript, parseScriptLine } from '../src/guidance/FlightScript.ts';
import type { ScriptParseResult, ScriptCommand, MissionScript, ScriptCondition, ScriptAction, ComparisonOperator, LogicalOperator, ConditionVariable, ActionType, SASModeValue } from '../src/guidance/FlightScript.ts';

// Helper function to assert conditions
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

// Test Suite
async function runTests() {
    console.log("🧪 Running FlightScript tests...");

    // 1. Happy Path: Basic Script Parsing
    console.log("  - Testing Basic Script Parsing");
    const basicScript = `
        // Initial setup
        WHEN ALTITUDE > 1000 THEN PITCH 80
        WHEN VELOCITY > 200 THEN SAS PROGRADE
        WHEN FUEL < 0.1 THEN STAGE
    `;
    const basicResult = parseMissionScript(basicScript, "Basic Script");

    assert(basicResult.success === true, "Basic script should parse successfully");
    assert(basicResult.script !== undefined, "Script object should be returned");
    assert(basicResult.script?.name === "Basic Script", "Script name should be set correctly");
    assert(basicResult.script?.commands.length === 3, "Should parse 3 commands");

    const cmd1 = basicResult.script!.commands[0];
    assert(cmd1.condition.clauses[0].variable === 'ALTITUDE', "First command variable correct");
    assert(cmd1.condition.clauses[0].operator === '>', "First command operator correct");
    assert(cmd1.condition.clauses[0].value === 1000, "First command value correct");
    assert(cmd1.action.type === 'PITCH', "First command action type correct");
    assert(cmd1.action.value === 80, "First command action value correct");

    const cmd2 = basicResult.script!.commands[1];
    assert(cmd2.action.type === 'SAS', "Second command action type correct");
    assert(cmd2.action.value === 'PROGRADE', "Second command action value correct");

    const cmd3 = basicResult.script!.commands[2];
    assert(cmd3.action.type === 'STAGE', "Third command action type correct");
    assert(cmd3.oneShot === true, "STAGE command should be one-shot");


    // 2. Condition Parsing: All Variables and Operators
    console.log("  - Testing Condition Parsing (Variables & Operators)");
    const conditionScript = `
        WHEN ALTITUDE >= 100 THEN STAGE
        WHEN VELOCITY <= 200 THEN STAGE
        WHEN VERTICAL_VEL == 50 THEN STAGE
        WHEN HORIZONTAL_VEL != 10 THEN STAGE
        WHEN APOGEE > 100000 THEN STAGE
        WHEN FUEL < 0.5 THEN STAGE
        WHEN TIME > 60 THEN STAGE
        WHEN THROTTLE == 1.0 THEN STAGE
        WHEN DYNAMIC_PRESSURE > 20000 THEN STAGE
    `;
    const condResult = parseMissionScript(conditionScript);
    assert(condResult.success === true, "Condition script should parse successfully");
    assert(condResult.script?.commands.length === 9, "Should parse 9 commands");

    const ops = ['>=', '<=', '==', '!=', '>', '<', '>', '==', '>'];
    const vars = ['ALTITUDE', 'VELOCITY', 'VERTICAL_VEL', 'HORIZONTAL_VEL', 'APOGEE', 'FUEL', 'TIME', 'THROTTLE', 'DYNAMIC_PRESSURE'];

    condResult.script?.commands.forEach((cmd, i) => {
        assert(cmd.condition.clauses[0].operator === ops[i], `Command ${i} operator correct`);
        assert(cmd.condition.clauses[0].variable === vars[i], `Command ${i} variable correct`);
    });


    // 3. Complex Conditions: AND / OR Logic
    console.log("  - Testing Complex Conditions (AND / OR)");
    const complexScript = `
        WHEN ALTITUDE > 1000 AND VELOCITY < 500 THEN PITCH 45
        WHEN APOGEE > 100000 OR FUEL < 0.1 THEN STAGE
        WHEN ALTITUDE > 5000 AND VELOCITY > 1000 AND DYNAMIC_PRESSURE < 10000 THEN THROTTLE 100
    `;
    const complexResult = parseMissionScript(complexScript);
    assert(complexResult.success === true, "Complex script should parse successfully");

    const c1 = complexResult.script!.commands[0];
    assert(c1.condition.clauses.length === 2, "First command has 2 clauses");
    assert(c1.condition.logicalOperators.length === 1, "First command has 1 logical operator");
    assert(c1.condition.logicalOperators[0] === 'AND', "First command operator is AND");

    const c2 = complexResult.script!.commands[1];
    assert(c2.condition.clauses.length === 2, "Second command has 2 clauses");
    assert(c2.condition.logicalOperators[0] === 'OR', "Second command operator is OR");

    const c3 = complexResult.script!.commands[2];
    assert(c3.condition.clauses.length === 3, "Third command has 3 clauses");
    assert(c3.condition.logicalOperators.length === 2, "Third command has 2 logical operators");
    assert(c3.condition.logicalOperators[0] === 'AND' && c3.condition.logicalOperators[1] === 'AND', "Third command operators are AND");


    // 4. Action Parsing: All Action Types
    console.log("  - Testing Action Parsing (All Types)");
    const actionScript = `
        WHEN TIME > 10 THEN PITCH -45.5
        WHEN TIME > 20 THEN THROTTLE 50
        WHEN TIME > 30 THEN THROTTLE 0.75
        WHEN TIME > 40 THEN SAS STABILITY
        WHEN TIME > 50 THEN SAS OFF
        WHEN TIME > 60 THEN ABORT
    `;
    const actionResult = parseMissionScript(actionScript);
    assert(actionResult.success === true, "Action script should parse successfully");

    const cmds = actionResult.script!.commands;
    assert(cmds[0].action.type === 'PITCH' && cmds[0].action.value === -45.5, "PITCH negative decimal correct");
    assert(cmds[1].action.type === 'THROTTLE' && cmds[1].action.value === 0.5, "THROTTLE percentage converted to fraction");
    assert(cmds[2].action.type === 'THROTTLE' && cmds[2].action.value === 0.75, "THROTTLE fraction remains fraction");
    assert(cmds[3].action.type === 'SAS' && cmds[3].action.value === 'STABILITY', "SAS STABILITY correct");
    assert(cmds[4].action.type === 'SAS' && cmds[4].action.value === 'OFF', "SAS OFF correct");
    assert(cmds[5].action.type === 'ABORT', "ABORT correct");


    // 5. Edge Cases: Comments, Whitespace, Case Insensitivity
    console.log("  - Testing Edge Cases (Comments, Whitespace, Case)");
    const edgeScript = `
        # Python style comment
        // C style comment

        when altitude > 1000 then pitch 90
        WHEN   velocity   >   100   THEN   sas   prograde
    `;
    const edgeResult = parseMissionScript(edgeScript);
    assert(edgeResult.success === true, "Edge case script should parse successfully");
    assert(edgeResult.script?.commands.length === 2, "Should parse 2 commands (ignoring comments/empty lines)");

    const e1 = edgeResult.script!.commands[0];
    assert(e1.condition.clauses[0].variable === 'ALTITUDE', "Lowercase variable parsed correctly");
    assert(e1.action.type === 'PITCH', "Lowercase action parsed correctly");

    const e2 = edgeResult.script!.commands[1];
    assert(e2.condition.clauses[0].variable === 'VELOCITY', "Extra whitespace handled in variable");
    assert(e2.action.value === 'PROGRADE', "Extra whitespace handled in action value");


    // 6. Error Handling: Invalid Syntax
    console.log("  - Testing Error Handling");
    const errorScript = `
        WHEN ALTITUDE > 1000 PITCH 90
        WHEN INVALID_VAR > 100 THEN STAGE
        WHEN ALTITUDE >> 100 THEN STAGE
        WHEN ALTITUDE > 100 THEN INVALID_ACTION
    `;
    const errorResult = parseMissionScript(errorScript);
    assert(errorResult.success === false, "Error script should fail parsing");
    assert(errorResult.errors.length === 4, "Should report 4 errors");

    assert(errorResult.errors[0].line === 2, "First error on line 2 (empty line 1 ignored)");
    assert(errorResult.errors[0].error?.includes("Expected: WHEN <condition> THEN <action>"), "Missing THEN detected");

    assert(errorResult.errors[1].line === 3, "Second error on line 3");
    assert(errorResult.errors[1].error?.includes("Invalid condition"), "Invalid variable detected");

    assert(errorResult.errors[2].line === 4, "Third error on line 4");
    assert(errorResult.errors[2].error?.includes("Invalid condition"), "Invalid operator detected");

    assert(errorResult.errors[3].line === 5, "Fourth error on line 5");
    assert(errorResult.errors[3].error?.includes("Invalid action"), "Invalid action detected");


    console.log("✅ All FlightScript tests passed!");
}

try {
    await runTests();
} catch (e) {
    console.error("❌ Tests failed!");
    console.error(e);
    process.exit(1);
}
