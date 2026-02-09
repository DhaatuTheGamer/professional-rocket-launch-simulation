
import {
    EnvironmentSystem,
    DEFAULT_WIND_LAYERS,
    type WindLayer
} from '../src/physics/Environment.ts';
import { Vec2 } from '../src/types/index.ts';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion failed: ${message}`);
        throw new Error(message);
    }
}

function runTests() {
    console.log("🧪 Running Environment System tests...");

    const env = new EnvironmentSystem();

    // 1. Basic Wind Lookup
    console.log("  - Testing Basic Wind Lookup");
    // At 0m (Surface)
    const wind0 = env.getWindAtAltitude(0);
    // Should match layer 0: speed 5, dir PI/4
    // -cos(PI/4)*5, -sin(PI/4)*5
    const expectedSpeed0 = 5;
    const speed0 = Vec2.magnitude(wind0);
    assert(Math.abs(speed0 - expectedSpeed0) < 0.001, `Surface wind speed should be ${expectedSpeed0}, got ${speed0}`);

    // At 500m (Middle of first layer 0-1000)
    // Interpolation happens between current layer and next layer IF next layer starts where current ends.
    // Layer 0: 0-1000. Next layer (index 1) starts at 1000.
    // So it should interpolate towards layer 1.
    // Layer 0: 5 m/s. Layer 1: 12 m/s.
    // At 500m (progress 0.5), speed should be (5+12)/2 = 8.5.
    const wind500 = env.getWindAtAltitude(500);
    const speed500 = Vec2.magnitude(wind500);
    assert(Math.abs(speed500 - 8.5) < 0.001, `Wind speed at 500m should be 8.5, got ${speed500}`);

    // At 1000m (Start of second layer)
    // Layer 1: 1000-5000.
    // Should be exactly 12.
    const wind1000 = env.getWindAtAltitude(1000);
    const speed1000 = Vec2.magnitude(wind1000);
    assert(Math.abs(speed1000 - 12) < 0.001, `Wind speed at 1000m should be 12, got ${speed1000}`);

    // 2. High Altitude
    console.log("  - Testing High Altitude");
    // 60000m. Top layer is 50000-Infinity.
    // Speed 2. Next layer? None.
    // So it should be constant 2.
    const wind60k = env.getWindAtAltitude(60000);
    const speed60k = Vec2.magnitude(wind60k);
    assert(Math.abs(speed60k - 2) < 0.001, `Wind speed at 60km should be 2, got ${speed60k}`);

    // Negative Altitude
    const windNeg = env.getWindAtAltitude(-100);
    const speedNeg = Vec2.magnitude(windNeg);
    assert(Math.abs(speedNeg - 5) < 0.001, `Negative altitude should be clamped to 0, got ${speedNeg}`);

    // 3. Custom Layers
    console.log("  - Testing Custom Layers");
    const customLayers: WindLayer[] = [
        { altitudeMin: 0, altitudeMax: 100, windSpeed: 10, windDirection: 0 },
        { altitudeMin: 100, altitudeMax: 200, windSpeed: 20, windDirection: 0 }
    ];
    env.setWindLayers(customLayers);

    // At 50m. Interpolate 10 -> 20. Expected 15.
    const wind50 = env.getWindAtAltitude(50);
    const speed50 = Vec2.magnitude(wind50);
    assert(Math.abs(speed50 - 15) < 0.001, `Custom layer wind speed at 50m should be 15, got ${speed50}`);

    // At 150m. Layer 100-200. Next layer? None.
    // So constant 20.
    const wind150 = env.getWindAtAltitude(150);
    const speed150 = Vec2.magnitude(wind150);
    assert(Math.abs(speed150 - 20) < 0.001, `Custom layer wind speed at 150m should be 20, got ${speed150}`);

    // 4. Unsorted Layers
    console.log("  - Testing Unsorted Layers");
    const unsortedLayers: WindLayer[] = [
        { altitudeMin: 100, altitudeMax: 200, windSpeed: 20, windDirection: 0 },
        { altitudeMin: 0, altitudeMax: 100, windSpeed: 10, windDirection: 0 }
    ];
    env.setWindLayers(unsortedLayers);

    // Check 50m. Should find 0-100 layer, then find next layer starting at 100 (which is 100-200).
    // Interpolation should still work: 10 -> 20. At 50m -> 15.
    const wind50Unsorted = env.getWindAtAltitude(50);
    const speed50Unsorted = Vec2.magnitude(wind50Unsorted);
    assert(Math.abs(speed50Unsorted - 15) < 0.001, `Unsorted layer wind speed at 50m should be 15, got ${speed50Unsorted}`);

    console.log("✅ All Environment tests passed!");
}

runTests();
