
import { EnvironmentSystem } from '../src/physics/Environment.ts';
import type { WindLayer } from '../src/physics/Environment.ts';

const perf = performance;

function runBenchmark() {
    console.log("🚀 Benchmarking Environment Wind Lookup...");

    const env = new EnvironmentSystem();
    const layers = env.getConfig().windLayers;
    console.log(`Layer count: ${layers.length}`);

    const iterations = 1000000;
    const testAltitudes = new Float64Array(iterations);

    // Generate random altitudes: -500 to 60000
    for(let i=0; i<iterations; i++) {
        const r = Math.random();
        if (r < 0.1) testAltitudes[i] = -100;
        else if (r > 0.9) testAltitudes[i] = 100000;
        else testAltitudes[i] = Math.random() * 55000;
    }

    // Warmup
    for(let i=0; i<1000; i++) {
        env.getWindAtAltitude(testAltitudes[i]);
    }

    // --- Measure ---
    const start = perf.now();
    let checkSum = 0;
    for(let i=0; i<iterations; i++) {
        const wind = env.getWindAtAltitude(testAltitudes[i]);
        checkSum += wind.x + wind.y;
    }
    const end = perf.now();
    const time = end - start;

    console.log(`Execution Time: ${time.toFixed(2)}ms`);
    console.log(`Checksum: ${checkSum}`);
    console.log(`Ops/sec: ${(iterations / (time / 1000)).toFixed(0)}`);
}

runBenchmark();
