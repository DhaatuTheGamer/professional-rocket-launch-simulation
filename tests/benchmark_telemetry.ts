
import { TelemetrySystem } from '../src/ui/Telemetry.ts';

const perf = performance;

// Mock DOM
global.document = {
    getElementById: (id: string) => {
        if (id === 'graph-canvas') {
            return {
                getContext: () => ({
                    clearRect: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                }),
                width: 800,
                height: 600
            };
        }
        return null;
    }
} as any;

function runBenchmark() {
    console.log("🚀 Benchmarking TelemetrySystem Class...");

    const iterations = 1000;
    const updatesPerIteration = 350; // Fill buffer and shift some

    const telemetry = new TelemetrySystem();

    // Warmup
    for (let i = 0; i < 100; i++) {
        telemetry.update(i * 0.2, 100, 100);
        telemetry.draw();
    }
    telemetry.clear();

    const start = perf.now();

    for (let i = 0; i < iterations; i++) {
        telemetry.clear();
        let time = 0;
        // Simulate a flight
        for (let j = 0; j < updatesPerIteration; j++) {
            time += 0.2;
            const alt = Math.sin(j * 0.1) * 1000 + 1000;
            const vel = Math.cos(j * 0.1) * 500 + 500;
            telemetry.update(time, alt, vel);

            // Draw every frame (simulated)
            telemetry.draw();
        }
    }

    const end = perf.now();
    const totalTime = end - start;
    const timePerIteration = totalTime / iterations;

    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Time per Flight (350 updates + draws): ${timePerIteration.toFixed(2)}ms`);
    console.log(`Avg time per frame: ${(timePerIteration / updatesPerIteration).toFixed(4)}ms`);
}

runBenchmark();
