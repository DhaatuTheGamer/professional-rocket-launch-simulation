
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
let nextEntityToUpdate = 0;
function updateOrbitPathsOptimized(entities: MockVessel[], now: number) {
    if (entities.length === 0) return 0;

    // Calculate how many entities to update per frame to cover all in 100ms (approx 6 frames at 60fps)
    // Or just pick a fixed budget.
    // The requirement is "at most once per frame or less frequently (e.g., every 10 frames or 100ms)"
    // It implies decoupling.

    // Strategy: Update a subset of entities each frame.
    // Target update rate: every 100ms for each entity.
    // If we call this function every 16ms (60fps), we have ~6 calls per 100ms.
    // So we should update entities.length / 6 entities per call.

    // We also want to respect the 100ms throttle.

    let updates = 0;
    const updateBudget = Math.ceil(entities.length / 6); // Spread over 6 frames (approx 100ms)

    let checkedCount = 0;
    // We loop until we exhaust our budget OR we have checked all entities (in case list is small)

    // Actually, simple round-robin is best.
    // We process 'updateBudget' entities starting from 'nextEntityToUpdate'.

    for (let i = 0; i < updateBudget; i++) {
        const index = (nextEntityToUpdate + i) % entities.length;
        const e = entities[index];

        if (!e.crashed) {
             // We can still respect the time check, but since we are scheduling round-robin,
             // we are implicitly throttling.
             // But if the loop is faster than 100ms, we might update too often.
             // So keep the check.

             if (now - e.lastOrbitUpdate >= 100) {
                 // Update logic...
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

                     for (let k = 0; k < 200; k++) {
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
        }
    }

    nextEntityToUpdate = (nextEntityToUpdate + updateBudget) % entities.length;
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
    nextEntityToUpdate = 0; // Reset

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
