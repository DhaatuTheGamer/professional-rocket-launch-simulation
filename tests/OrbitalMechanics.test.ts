import { calculateOrbitalElements, MU } from '../src/physics/OrbitalMechanics.ts';
import { R_EARTH, GRAVITY } from '../src/constants.ts';
import { vec2, Vec2 } from '../src/types/index.ts';

// Helper for assertions
function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

// Helper for approximate float comparison
function assertClose(actual: number, expected: number, tolerance: number = 1e-4, message?: string) {
    if (Math.abs(actual - expected) > tolerance) {
        const msg = message || `Expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`;
        console.error(`❌ Assertion failed: ${msg}`);
        throw new Error(msg);
    }
}

function runTests() {
    console.log("🧪 Running OrbitalMechanics tests...");

    // 1. Circular Orbit Test
    console.log("  - Testing Circular Orbit");
    {
        const altitude = 400000; // 400 km
        const rMag = R_EARTH + altitude;
        // Circular velocity: v = sqrt(mu/r)
        const vMag = Math.sqrt(MU / rMag);

        const r = vec2(rMag, 0);
        const v = vec2(0, vMag);

        const elements = calculateOrbitalElements(r, v);

        assertClose(elements.eccentricity, 0, 1e-6, "Eccentricity should be 0 for circular orbit");
        assertClose(elements.semiMajorAxis, rMag, 1, "Semi-major axis should equal radius for circular orbit");
        assertClose(elements.apoapsis, altitude, 1, "Apoapsis should equal altitude");
        assertClose(elements.periapsis, altitude, 1, "Periapsis should equal altitude");
    }

    // 2. Elliptical Orbit Test
    console.log("  - Testing Elliptical Orbit");
    {
        const altitude = 400000; // 400 km periapsis
        const rMag = R_EARTH + altitude;
        // Slightly faster than circular -> Elliptical
        const vMag = Math.sqrt(MU / rMag) * 1.1;

        const r = vec2(rMag, 0); // Start at periapsis
        const v = vec2(0, vMag);

        const elements = calculateOrbitalElements(r, v);

        assert(elements.eccentricity > 0.01, "Eccentricity should be positive");
        assert(elements.eccentricity < 1, "Eccentricity should be < 1");
        assert(elements.semiMajorAxis > rMag, "Semi-major axis should be larger than periapsis radius");

        // Since we start at r (periapsis), calculated periapsis should match altitude
        assertClose(elements.periapsis, altitude, 1, "Periapsis should match starting altitude");
        assert(elements.apoapsis > altitude, "Apoapsis should be higher than periapsis");
    }

    // 3. Parabolic/Escape Orbit Test
    console.log("  - Testing Parabolic/Escape Orbit");
    {
        const altitude = 400000;
        const rMag = R_EARTH + altitude;
        // Escape velocity: v = sqrt(2*mu/r)
        const vMag = Math.sqrt(2 * MU / rMag);

        const r = vec2(rMag, 0);
        const v = vec2(0, vMag);

        const elements = calculateOrbitalElements(r, v);

        // Ideally eccentricity = 1. Due to precision, might be very close.
        assertClose(elements.eccentricity, 1, 1e-5, "Eccentricity should be 1 for escape velocity");
        // Energy should be 0
        assertClose(elements.specificEnergy, 0, 1e-4, "Specific energy should be 0");
    }

    // 4. Hyperbolic Orbit Test
    console.log("  - Testing Hyperbolic Orbit");
    {
        const altitude = 400000;
        const rMag = R_EARTH + altitude;
        // Faster than escape velocity
        const vMag = Math.sqrt(2 * MU / rMag) * 1.2;

        const r = vec2(rMag, 0);
        const v = vec2(0, vMag);

        const elements = calculateOrbitalElements(r, v);

        assert(elements.eccentricity > 1, "Eccentricity should be > 1 for hyperbolic orbit");
        // Semi-major axis is negative for hyperbolas in this implementation
        // a = -mu / 2E. E is positive. So a is negative.
        assert(elements.semiMajorAxis < 0, "Semi-major axis should be negative for hyperbolic orbit");
        assert(elements.specificEnergy > 0, "Specific energy should be positive");
    }

    // 5. Inclined Orbit (2D check)
    // Even though 2D, if we have x and y components, we can check basic consistency
    console.log("  - Testing Inclined/Angled Orbit");
    {
         const altitude = 400000;
         const rMag = R_EARTH + altitude;
         // 45 degrees position
         const r = vec2(rMag * Math.cos(Math.PI/4), rMag * Math.sin(Math.PI/4));
         // Velocity perpendicular to r
         const vMag = Math.sqrt(MU/rMag);
         // 45 + 90 = 135 degrees velocity direction
         const v = vec2(vMag * Math.cos(3*Math.PI/4), vMag * Math.sin(3*Math.PI/4));

         const elements = calculateOrbitalElements(r, v);

         assertClose(elements.eccentricity, 0, 1e-6, "Eccentricity should be 0 for circular inclined orbit");
         assertClose(elements.semiMajorAxis, rMag, 1, "Semi-major axis should be correct");
    }


    console.log("✅ All OrbitalMechanics tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!", e);
    process.exit(1);
}
