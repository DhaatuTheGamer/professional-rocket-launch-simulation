
import { performance } from 'perf_hooks';

interface TelemetryDataPoint {
    t: number;
    alt: number;
    vel: number;
}

function runBenchmark() {
    console.log("🚀 Benchmarking Telemetry Logic...");

    const dataSize = 5000;
    const iterations = 1000;
    const data: TelemetryDataPoint[] = [];

    // Generate test data
    for (let i = 0; i < dataSize; i++) {
        data.push({
            t: i * 0.1,
            alt: Math.random() * 2000,
            vel: Math.random() * 500
        });
    }

    console.log(`Test Data Size: ${dataSize} points`);
    console.log(`Iterations: ${iterations}`);

    // --- Baseline Implementation ---
    const startBaseline = performance.now();
    let baselineAlt = 0;
    let baselineVel = 0;

    for (let i = 0; i < iterations; i++) {
        // Original logic from src/ui/Telemetry.ts
        const maxAlt = Math.max(...data.map(d => d.alt), 100);
        const maxVel = Math.max(...data.map(d => d.vel), 100);

        // Store just to ensure it's not optimized away
        baselineAlt = maxAlt;
        baselineVel = maxVel;
    }
    const endBaseline = performance.now();
    const timeBaseline = endBaseline - startBaseline;

    // --- Optimized Implementation ---
    const startOptimized = performance.now();
    let optimizedAlt = 0;
    let optimizedVel = 0;

    for (let i = 0; i < iterations; i++) {
        // Single pass loop logic
        let maxAlt = 100;
        let maxVel = 100;

        for (const d of data) {
            if (d.alt > maxAlt) maxAlt = d.alt;
            if (d.vel > maxVel) maxVel = d.vel;
        }

        optimizedAlt = maxAlt;
        optimizedVel = maxVel;
    }
    const endOptimized = performance.now();
    const timeOptimized = endOptimized - startOptimized;

    // Verify Correctness
    if (baselineAlt !== optimizedAlt || baselineVel !== optimizedVel) {
        console.error("❌ ERROR: Optimized logic produced different results!");
        console.error(`Baseline: Alt=${baselineAlt}, Vel=${baselineVel}`);
        console.error(`Optimized: Alt=${optimizedAlt}, Vel=${optimizedVel}`);
        process.exit(1);
    } else {
        console.log("✅ Verification Passed: Results match.");
    }

    console.log("\n--- Results ---");
    console.log(`Baseline Time: ${timeBaseline.toFixed(2)}ms`);
    console.log(`Optimized Time: ${timeOptimized.toFixed(2)}ms`);
    const speedup = timeBaseline / timeOptimized;
    console.log(`Speedup: ${speedup.toFixed(2)}x`);

    if (timeOptimized >= timeBaseline) {
        console.warn("⚠️ Warning: No significant speedup detected.");
    }
}

runBenchmark();
