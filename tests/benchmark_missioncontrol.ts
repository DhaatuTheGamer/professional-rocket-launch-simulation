
import { MissionControl } from '../src/ui/MissionControl';
import { Game } from '../src/core/Game';

const perf = performance;

// Mock DOM
global.document = {
    getElementById: (id: string) => {
        if (id === 'mission-control-overlay') {
            return { style: { display: 'none' } };
        }
        return null;
    }
} as any;

// Mock Canvas Context
const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    fillText: () => {},
} as unknown as CanvasRenderingContext2D;

function runBenchmark() {
    console.log("🚀 Benchmarking MissionControl Class...");

    // Mock Game
    const mockGame = {
        trackedEntity: { x: 0, y: 100000, vx: 7000, vy: 0 },
        missionTime: 100,
    } as unknown as Game;

    const missionControl = new MissionControl(mockGame);
    missionControl.toggle(); // Make it visible

    // Populate pathPoints with 3600 points (approx 1 hour of flight)
    // Access private pathPoints array to clear it first
    const points = (missionControl as any).pathPoints;
    points.length = 0;

    for (let i = 0; i < 3600; i++) {
        const lat = Math.sin(i * 0.01) * 0.5;
        const lon = ((i * 0.01) % (Math.PI * 2)) - Math.PI;

        // Use the private addPathPoint method to ensure relX/relY are calculated
        (missionControl as any).addPathPoint(lat, lon);
    }

    const iterations = 1000;
    const width = 1920;
    const height = 1080;

    const start = perf.now();

    for (let i = 0; i < iterations; i++) {
        missionControl.draw(mockCtx, width, height);
    }

    const end = perf.now();
    const totalTime = end - start;
    const timePerFrame = totalTime / iterations;

    console.log(`Total Time for ${iterations} frames (3600 points): ${totalTime.toFixed(2)}ms`);
    console.log(`Avg time per frame: ${timePerFrame.toFixed(4)}ms`);
}

runBenchmark();
