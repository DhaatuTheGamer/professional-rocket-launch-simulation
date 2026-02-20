
import { TelemetrySystem } from '../src/ui/Telemetry';

const perf = performance;

// Mock DOM
global.document = {
    getElementById: (id: string) => {
        if (id === 'graph-canvas') {
            return {
                getContext: () => ({
                    clearRect: () => { },
                    beginPath: () => { },
                    moveTo: () => { },
                    lineTo: () => { },
                    stroke: () => { },
                }),
                width: 800,
                height: 600
            };
        }
        return null;
    }
} as any;

function runStressBenchmark() {
    console.log("🚀 Stress Benchmarking TelemetrySystem Class (Worst Case)...");

    const iterations = 5000;
    const updatesPerIteration = 600; // 300 to fill, 300 to shift

    const telemetry = new TelemetrySystem();
    const start = perf.now();

    for (let i = 0; i < iterations; i++) {
        telemetry.clear();
        let time = 0;

        // Fill with descending values
        for (let j = 0; j < 300; j++) {
            time += 0.2;
            const val = 1000 - j;
            telemetry.update(time, val, val);
        }

        // Now every update removes the max and triggers a rescan
        for (let j = 0; j < 300; j++) {
            time += 0.2;
            const val = 500; // Smaller value
            telemetry.update(time, val, val);
        }
    }

    const end = perf.now();
    const totalTime = end - start;
    const timePerIteration = totalTime / iterations;

    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Time per Iteration: ${timePerIteration.toFixed(2)}ms`);
}

runStressBenchmark();
