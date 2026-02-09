
import { performance } from 'perf_hooks';

// Mock constants
const R_EARTH = 6371000;
const PIXELS_PER_METER = 10;
const GROUND_Y = 1000;

interface OrbitalElements {
    phi: number;
    r: number;
}

interface MockVessel {
    x: number;
    y: number;
    vx: number;
    vy: number;
    h: number;
    throttle: number;
    crashed: boolean;
    orbitPath: OrbitalElements[] | null;
    lastOrbitUpdate: number;
}

function createEntities(count: number): MockVessel[] {
    const entities: MockVessel[] = [];
    for (let i = 0; i < count; i++) {
        entities.push({
            x: Math.random() * 1000,
            y: Math.random() * 500,
            vx: Math.random() * 100,
            vy: Math.random() * 100,
            h: 10,
            throttle: 1, // Force update
            crashed: false,
            orbitPath: null,
            lastOrbitUpdate: 0
        });
    }
    return entities;
}

function updateOrbitPathsOriginal(entities: MockVessel[], now: number) {
    let updates = 0;
    entities.forEach(e => {
        if (e.crashed) return;

        // Throttle: minimum 100ms between updates
        if (now - e.lastOrbitUpdate < 100) return;

        const alt = (GROUND_Y - e.y - e.h) / PIXELS_PER_METER;
        let needsUpdate = false;

        if (e.throttle > 0) needsUpdate = true;
        if (alt < 140000) needsUpdate = true;
        if (now - e.lastOrbitUpdate > 1000) needsUpdate = true;
        if (!e.orbitPath) needsUpdate = true;

        if (needsUpdate) {
            updates++;
            e.orbitPath = [];
            e.lastOrbitUpdate = now;

            // Simple orbit prediction
            let simState = {
                x: e.x / 10,
                y: e.y / 10,
                vx: e.vx,
                vy: e.vy
            };

            const dtPred = 10;
            const startPhi = simState.x / R_EARTH;
            const startR = R_EARTH + (GROUND_Y / 10 - simState.y - e.h / 10);
            e.orbitPath.push({ phi: startPhi, r: startR });

            for (let i = 0; i < 200; i++) {
                const pAlt = GROUND_Y / 10 - simState.y - e.h / 10;
                const pRad = pAlt + R_EARTH;
                const pG = 9.8 * Math.pow(R_EARTH / pRad, 2);
                const pFy = pG - (simState.vx ** 2) / pRad;

                simState.vy += pFy * dtPred;
                simState.x += simState.vx * dtPred;
                simState.y += simState.vy * dtPred;

                if (simState.y * 10 > GROUND_Y) break;

                const pPhi = (simState.x * 10) / R_EARTH;
                const pR = R_EARTH + (GROUND_Y / 10 - simState.y - e.h / 10);
                e.orbitPath.push({ phi: pPhi, r: pR });
            }
        }
    });
    return updates;
}

// Optimized version: Spread updates
let nextOrbitUpdateIndex = 0;
function updateOrbitPathsOptimized(entities: MockVessel[], now: number) {
    const entityCount = entities.length;
    if (entityCount === 0) return 0;

    let updates = 0;

    // Process a subset of entities per frame to target a 100ms update cycle (6 frames at 60fps)
    const batchSize = Math.ceil(entityCount / 6);

    for (let i = 0; i < batchSize; i++) {
        const index = (nextOrbitUpdateIndex + i) % entityCount;
        const e = entities[index];

        if (!e) continue;
        if (e.crashed) continue;

        // Throttle: minimum 100ms between updates
        if (now - e.lastOrbitUpdate < 100) continue;

        const alt = (GROUND_Y - e.y - e.h) / PIXELS_PER_METER;
        let needsUpdate = false;

        if (e.throttle > 0) needsUpdate = true;
        if (alt < 140000) needsUpdate = true;
        if (now - e.lastOrbitUpdate > 1000) needsUpdate = true;
        if (!e.orbitPath) needsUpdate = true;

        if (needsUpdate) {
            updates++;
            e.orbitPath = [];
            e.lastOrbitUpdate = now;

            // Simple orbit prediction
            let simState = {
                x: e.x / 10,
                y: e.y / 10,
                vx: e.vx,
                vy: e.vy
            };

            const dtPred = 10;
            const startPhi = simState.x / R_EARTH;
            const startR = R_EARTH + (GROUND_Y / 10 - simState.y - e.h / 10);
            e.orbitPath.push({ phi: startPhi, r: startR });

            for (let j = 0; j < 200; j++) {
                const pAlt = GROUND_Y / 10 - simState.y - e.h / 10;
                const pRad = pAlt + R_EARTH;
                const pG = 9.8 * Math.pow(R_EARTH / pRad, 2);
                const pFy = pG - (simState.vx ** 2) / pRad;

                simState.vy += pFy * dtPred;
                simState.x += simState.vx * dtPred;
                simState.y += simState.vy * dtPred;

                if (simState.y * 10 > GROUND_Y) break;

                const pPhi = (simState.x * 10) / R_EARTH;
                const pR = R_EARTH + (GROUND_Y / 10 - simState.y - e.h / 10);
                e.orbitPath.push({ phi: pPhi, r: pR });
            }
        }
    }

    // Advance index
    nextOrbitUpdateIndex = (nextOrbitUpdateIndex + batchSize) % entityCount;
    return updates;
}


async function runBenchmark() {
    const entityCount = 1000;
    const frames = 60;
    const frameTime = 16.66; // ms

    console.log(`Setting up ${entityCount} entities...`);
    const entitiesOriginal = createEntities(entityCount);
    const entitiesOptimized = createEntities(entityCount);

    console.log("Running baseline...");
    let baselineMaxTime = 0;
    let baselineTotalUpdates = 0;
    let currentTime = 0;

    const baselineTimes: number[] = [];

    for (let f = 0; f < frames; f++) {
        const start = performance.now();
        const updates = updateOrbitPathsOriginal(entitiesOriginal, currentTime);
        const duration = performance.now() - start;

        baselineTimes.push(duration);
        baselineTotalUpdates += updates;
        if (duration > baselineMaxTime) baselineMaxTime = duration;

        currentTime += frameTime;
    }

    console.log("Running optimized...");
    let optimizedMaxTime = 0;
    let optimizedTotalUpdates = 0;
    currentTime = 0;
    nextOrbitUpdateIndex = 0; // Reset

    const optimizedTimes: number[] = [];

    for (let f = 0; f < frames; f++) {
        const start = performance.now();
        const updates = updateOrbitPathsOptimized(entitiesOptimized, currentTime);
        const duration = performance.now() - start;

        optimizedTimes.push(duration);
        optimizedTotalUpdates += updates;
        if (duration > optimizedMaxTime) optimizedMaxTime = duration;

        currentTime += frameTime;
    }

    console.log("\nResults:");
    console.log("Baseline Max Frame Time:", baselineMaxTime.toFixed(4), "ms");
    console.log("Optimized Max Frame Time:", optimizedMaxTime.toFixed(4), "ms");

    console.log("Baseline Total Updates:", baselineTotalUpdates);
    console.log("Optimized Total Updates:", optimizedTotalUpdates);

    // Analyze smoothness
    const baselineVariance = calculateVariance(baselineTimes);
    const optimizedVariance = calculateVariance(optimizedTimes);

    console.log("Baseline Variance:", baselineVariance.toFixed(4));
    console.log("Optimized Variance:", optimizedVariance.toFixed(4));

    if (optimizedMaxTime < baselineMaxTime) {
        console.log("✅ Success: Optimized version reduces peak frame time.");
    } else {
        console.log("⚠️ Warning: No reduction in peak frame time.");
    }
}

function calculateVariance(times: number[]) {
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    return times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
}

runBenchmark();
