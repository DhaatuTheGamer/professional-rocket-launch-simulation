import {
    calculateOrbitalElements,
    calculateVisViva,
    calculateCircularVelocity,
    calculateHohmannTransfer,
    calculateCircularizationFromElements,
    calculateGroundTrack,
    MU,
    LAUNCH_SITE
} from '../src/physics/OrbitalMechanics.ts';
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

    // 1. Orbital Elements Tests
    console.log("  - Testing calculateOrbitalElements");

    // 1.1 Circular Orbit
    {
        const altitude = 400000; // 400 km
        const rMag = R_EARTH + altitude;
        const vMag = Math.sqrt(MU / rMag);
        const r = vec2(rMag, 0);
        const v = vec2(0, vMag);
        const elements = calculateOrbitalElements(r, v);

        assertClose(elements.eccentricity, 0, 1e-6, "Circular orbit eccentricity should be 0");
        assertClose(elements.semiMajorAxis, rMag, 1, "Circular orbit SMA should match radius");
    }

    // 1.2 Elliptical Orbit
    {
        const altitude = 400000;
        const rMag = R_EARTH + altitude;
        const vMag = Math.sqrt(MU / rMag) * 1.1; // Faster than circular
        const r = vec2(rMag, 0);
        const v = vec2(0, vMag);
        const elements = calculateOrbitalElements(r, v);

        assert(elements.eccentricity > 0 && elements.eccentricity < 1, "Elliptical eccentricity should be between 0 and 1");
        assertClose(elements.periapsis, altitude, 1, "Periapsis should match starting altitude");
    }

    // 2. Vis-Viva Equation Tests
    console.log("  - Testing calculateVisViva");
    {
        // For a circular orbit, v = sqrt(mu/r)
        // Vis-Viva: v = sqrt(mu * (2/r - 1/a)). For circular, a=r => 2/r - 1/r = 1/r => v = sqrt(mu/r)
        const r = R_EARTH + 500000;
        const a = r;
        const v = calculateVisViva(r, a);
        const expectedV = Math.sqrt(MU / r);
        assertClose(v, expectedV, 1e-6, "Vis-Viva for circular orbit");

        // For elliptical orbit at periapsis
        // a = 10000km, r_p = 8000km
        const aEllipse = 10000000;
        const rPeri = 8000000;
        const vPeri = calculateVisViva(rPeri, aEllipse);
        const expectedVPeri = Math.sqrt(MU * (2/rPeri - 1/aEllipse));
        assertClose(vPeri, expectedVPeri, 1e-6, "Vis-Viva for elliptical orbit");
    }

    // 3. Circular Velocity Tests
    console.log("  - Testing calculateCircularVelocity");
    {
        const r = R_EARTH + 300000;
        const v = calculateCircularVelocity(r);
        assertClose(v, Math.sqrt(MU / r), 1e-6, "Circular velocity calculation");
    }

    // 4. Hohmann Transfer Tests
    console.log("  - Testing calculateHohmannTransfer");
    {
        // Transfer from 300km (LEO) to 35,786km (GEO altitude)
        const r1 = R_EARTH + 300000;
        const r2 = R_EARTH + 35786000;
        const thrust = 100000;
        const mass = 5000;

        const plan = calculateHohmannTransfer(r1, r2, thrust, mass);

        // Verification
        // a_transfer = (r1 + r2) / 2
        const aTransfer = (r1 + r2) / 2;
        // v1 (at r1 circular)
        const v1 = Math.sqrt(MU / r1);
        // v_transfer_perigee (at r1)
        const vTp = Math.sqrt(MU * (2/r1 - 1/aTransfer));
        // deltaV1
        const expectedDV1 = Math.abs(vTp - v1);

        assertClose(plan.deltaV1, expectedDV1, 1e-4, "Hohmann first burn delta-V");

        // v2 (at r2 circular)
        const v2 = Math.sqrt(MU / r2);
        // v_transfer_apogee (at r2)
        const vTa = Math.sqrt(MU * (2/r2 - 1/aTransfer));
        // deltaV2
        const expectedDV2 = Math.abs(v2 - vTa);

        assertClose(plan.deltaV2, expectedDV2, 1e-4, "Hohmann second burn delta-V");

        // Burn time check
        const expectedBurnTime = (expectedDV1 * mass) / thrust;
        assertClose(plan.burnTime1, expectedBurnTime, 1e-4, "Estimated burn time");
    }

    // 5. Circularization Tests
    console.log("  - Testing calculateCircularizationFromElements");
    {
        // Define an elliptical orbit
        // Periapsis: 200km, Apoapsis: 1000km
        const rp = R_EARTH + 200000;
        const ra = R_EARTH + 1000000;
        const a = (rp + ra) / 2;
        const e = (ra - rp) / (ra + rp);

        // We need a dummy 'elements' object.
        // We only populate what the function uses: apoapsis, periapsis, semiMajorAxis
        const elements = {
            semiMajorAxis: a,
            eccentricity: e,
            apoapsis: ra - R_EARTH,
            periapsis: rp - R_EARTH,
            trueAnomaly: 0,
            period: 0,
            specificEnergy: 0
        };

        const thrust = 50000;
        const mass = 10000;

        // Test circularization at Apoapsis
        const planApo = calculateCircularizationFromElements(elements, true, thrust, mass);

        // Should target a circular orbit at radius ra
        const vCurrentApo = Math.sqrt(MU * (2/ra - 1/a));
        const vTargetApo = Math.sqrt(MU / ra);
        const expectedDVApo = Math.abs(vTargetApo - vCurrentApo);

        assertClose(planApo.deltaV, expectedDVApo, 1e-4, "Circularization at Apoapsis Delta-V");
        assertClose(planApo.targetOrbit.apoapsis, elements.apoapsis, 1, "Target orbit altitude matches burn altitude");

        // Test circularization at Periapsis
        const planPeri = calculateCircularizationFromElements(elements, false, thrust, mass);

        // Should target a circular orbit at radius rp
        const vCurrentPeri = Math.sqrt(MU * (2/rp - 1/a));
        const vTargetPeri = Math.sqrt(MU / rp);
        const expectedDVPeri = Math.abs(vTargetPeri - vCurrentPeri);

        assertClose(planPeri.deltaV, expectedDVPeri, 1e-4, "Circularization at Periapsis Delta-V");
    }

    // 6. Ground Track Tests
    console.log("  - Testing calculateGroundTrack");
    {
        // Case 1: Start (0 distance, 0 time)
        const pos0 = calculateGroundTrack(0, 0);
        assertClose(pos0.lat, LAUNCH_SITE.lat, 1e-6, "Initial latitude should match launch site");
        assertClose(pos0.lon, LAUNCH_SITE.lon, 1e-6, "Initial longitude should match launch site");

        // Case 2: Move East along equator (ignoring that launch site is not at equator for simplicity of thought, but logic handles it)
        // Let's just move exactly one Earth circumference
        const circumference = 2 * Math.PI * R_EARTH;
        const timeForRotation = 0; // Instantaneous

        const posFullCircle = calculateGroundTrack(circumference, timeForRotation);
        // Should wrap around to same spot
        assertClose(posFullCircle.lat, LAUNCH_SITE.lat, 1e-4, "Latitude after full circle");
        assertClose(posFullCircle.lon, LAUNCH_SITE.lon, 1e-4, "Longitude after full circle");

        // Case 3: Effect of Earth Rotation
        // Stay at same "inertial" spot (downrange = 0), but time passes
        // The earth rotates underneath.
        // Launch site is at lon0. Earth rotates East (positive omega).
        // The point on earth under the inertial position (which is fixed) should effectively move West relative to the surface?
        // Wait, the function calculates ground track for a rocket moving downrange.
        // If downrange is 0, rocket is still at launch pad? No.
        // The `downrange` parameter usually implies distance traveled on the surface in the inertial frame (great circle arc).
        // Let's look at the implementation:
        // `rotOffset = OMEGA_EARTH * time`
        // `lon = lon0 + dLon - rotOffset`
        // If downrange=0, dLon=0.
        // lon = lon0 - rotOffset.
        // Earth rotates East (lon increases). The ground track (where the rocket is relative to Earth) should move West (lon decreases).
        // So `lon = lon0 - rotOffset` makes sense.

        const oneHour = 3600;
        const posTime = calculateGroundTrack(0, oneHour);
        const OMEGA_EARTH = 7.2921159e-5;
        const expectedLon = LAUNCH_SITE.lon - OMEGA_EARTH * oneHour;

        // Normalize expectedLon
        let normalizedExpected = ((expectedLon + Math.PI) % (2 * Math.PI)) - Math.PI;
        // The modulo operator in JS can return negative for negative operands.
        // (( -80deg - small ) + 180 ) % 360 - 180
        // Correct normalization logic:
        // ((x - min) % range + range) % range + min
        // But the function implementation is simple: ((lon + Math.PI) % (2 * Math.PI)) - Math.PI;
        // Let's verify that logic.

        assertClose(posTime.lon, normalizedExpected, 1e-5, "Longitude drift due to Earth rotation");
    }

    console.log("✅ All OrbitalMechanics tests passed!");
}

try {
    runTests();
} catch (e) {
    console.error("❌ Tests failed!", e);
    process.exit(1);
}
