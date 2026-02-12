// Physics Worker
// Handles the physics simulation loop

import { FullStack, Booster, UpperStage, Fairing, Payload } from '../physics/RocketComponents';
import { Vessel } from '../physics/Vessel';
import { EnvironmentSystem } from '../physics/Environment';
import { FlightTerminationSystem } from '../safety/FlightTermination';
import { FaultInjector } from '../safety/FaultInjector';

// State
let entities: Vessel[] = [];
let missionTime = 0;
const fts = new FlightTerminationSystem();
const environment = new EnvironmentSystem();
const faultInjector = new FaultInjector();
let groundY = 1000;

// Active vessel tracking (index or ref)
// In worker, we can just track the "main" one by index or reference
// Initial: entities[0] (FullStack)
let trackedIndex = 0;

// Constants
const FIXED_DT = 0.02;

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            init(payload || {});
            break;
        case 'STEP':
            step(payload);
            break;
        case 'COMMAND':
            handleCommand(payload);
            break;
    }
};

function init(config: any) {
    entities = [];
    missionTime = 0;
    trackedIndex = 0;

    const width = config.width || 1920;
    groundY = config.groundY || 1000;

    // Create initial rocket
    const rocket = new FullStack(width / 2, groundY - 160);
    entities.push(rocket);

    fts.reset();
    fts.setLaunchPosition(rocket.x);
    environment.reset();
    faultInjector.reset();

    postState();
}

function step(inputs: any) {
    const dt = inputs.dt || FIXED_DT;
    const timeScale = inputs.timeScale || 1;
    const simDt = dt * timeScale;

    // 1. Update Environment
    environment.update(simDt);

    // 2. Apply Controls
    // Input payload: { controls: { throttle, gimbal, ... }, activeId? }
    // We assume 'trackedIndex' is the one being controlled
    const v = entities[trackedIndex];
    if (v && inputs.controls) {
        v.throttle = inputs.controls.throttle;
        v.gimbalAngle = inputs.controls.gimbalAngle;

        if (inputs.controls.ignition) {
            v.active = true;
            // Force reset safety cutoff if re-igniting
            if ((v as any).engineState === 'off') {
                (v as any).engineState = 'starting';
            }
        }
        if (inputs.controls.cutoff) {
            v.active = false;
        }
    }

    // 3. Physics Integration
    // groundY is module-level state set in init()

    entities.forEach(e => {
        // Apply physics
        // We pass empty 'keys' because control is applied above via properties
        e.applyPhysics(simDt, {});

        // FTS Update
        // Only if liftoff? Main thread tracks liftoff for now, or we track it?
        // Let's rely on simple updates.
    });

    // 4. Fault Injector (if active)
    const trackedVessel = entities[trackedIndex];
    if (trackedVessel) {
        // Cast to any to access reliability if it's protected or missing on interface
        if ((trackedVessel as any).reliability) {
            faultInjector.update(trackedVessel, (trackedVessel as any).reliability, groundY, simDt);
        }
    }

    postState();
}

function handleCommand(cmd: any) {
    switch (cmd.type) {
        case 'STAGE':
            performStaging();
            break;
        // Other commands...
    }
}

function performStaging() {
    const tracked = entities[trackedIndex];
    if (!tracked) return;

    // Logic copied from Game.performStaging
    // We need to differentiate types.
    if (tracked instanceof FullStack) {
        // Sep S1
        entities = entities.filter(e => e !== tracked);

        const booster = new Booster(tracked.x, tracked.y, tracked.vx, tracked.vy);
        booster.angle = tracked.angle;
        booster.fuel = 0.05;
        booster.active = true;

        const upper = new UpperStage(tracked.x, tracked.y - 60, tracked.vx, tracked.vy + 2);
        upper.angle = tracked.angle;
        upper.active = true;
        upper.throttle = 1.0;

        // Add both
        entities.push(booster);
        entities.push(upper);

        // Track Upper Stage (last added)
        trackedIndex = entities.length - 1;

        self.postMessage({ type: 'EVENT', payload: { name: 'STAGING_S1', x: tracked.x, y: tracked.y } });

    } else if (tracked instanceof UpperStage) {
        if (!tracked.fairingsDeployed) {
            tracked.fairingsDeployed = true;

            // Create fairings
            const fL = new Fairing(tracked.x - 12, tracked.y - 40, tracked.vx - 10, tracked.vy, -1);
            fL.angle = tracked.angle - 0.5;
            entities.push(fL);

            const fR = new Fairing(tracked.x + 12, tracked.y - 40, tracked.vx + 10, tracked.vy, 1);
            fR.angle = tracked.angle + 0.5;
            entities.push(fR);

            self.postMessage({ type: 'EVENT', payload: { name: 'FAIRING_SEP' } });
        } else {
            // Payload Sep
            tracked.active = false;
            tracked.throttle = 0;

            const payload = new Payload(tracked.x, tracked.y - 20, tracked.vx, tracked.vy + 1);
            payload.angle = tracked.angle;
            entities.push(payload);

            trackedIndex = entities.length - 1;

            self.postMessage({ type: 'EVENT', payload: { name: 'PAYLOAD_SEP' } });
        }
    }

    postState();
}

function postState() {
    // Get state environment at ground (altitude 0) for basic telemetry
    // More complex environment data can be sent if needed
    const envState = environment.getState(0);

    const entitiesState = entities.map(e => ({
        type: e.constructor.name,
        x: e.x,
        y: e.y,
        vx: e.vx,
        vy: e.vy,
        angle: e.angle,
        throttle: e.throttle,
        gimbalAngle: e.gimbalAngle,
        // Specifics
        fairingsDeployed: e instanceof UpperStage ? e.fairingsDeployed : undefined,
        active: e.active,
        fuel: e.fuel,
        // We need engine state for HUD
        engineState: (e as any).engineState,
        ignitersRemaining: (e as any).ignitersRemaining
    }));

    self.postMessage({
        type: 'STATE',
        payload: {
            missionTime,
            entities: entitiesState,
            trackedIndex,
            fts: fts.getStatus(),
            environment: envState
        }
    });
}
