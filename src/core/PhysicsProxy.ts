/**
 * Physics Proxy
 * 
 * Main thread interface to the Physics Worker.
 * Handles:
 * - Worker instantiation
 * - Message passing (commands -> worker, state <- worker)
 * - State synchronization (keeping main thread entities in sync)
 */

import { IVessel, Vector2D } from '../types/index';
// We need the classes to instantiate "view" copies
import { FullStack, Booster, UpperStage, Fairing, Payload } from '../physics/RocketComponents';
import { Vessel } from '../physics/Vessel';

export interface PhysicsState {
    missionTime: number;
    entities: EntityState[];
    trackedIndex: number;
    fts?: any;
    environment?: any;
}

export interface EntityState {
    id?: string;
    type: string;
    x: number;
    y: number;
    angle: number;
    vx: number;
    vy: number;
    throttle: number;
    gimbalAngle: number;
    active: boolean;
    fuel?: number;
    engineState?: string;
    ignitersRemaining?: number;
    fairingsDeployed?: boolean;
}

export class PhysicsProxy {
    private worker: Worker;
    private latestState: PhysicsState | null = null;

    // Mapping from index/ID to local view instance
    private viewEntities: Vessel[] = [];

    private eventListeners: ((event: any) => void)[] = [];

    constructor() {
        // Use ES module worker syntax (supported by modern bundlers)
        this.worker = new Worker(new URL('./PhysicsWorker.ts', import.meta.url), { type: 'module' });

        this.worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'STATE') {
                this.latestState = payload;
                this.syncView();
            } else if (type === 'EVENT') {
                this.handleEvent(payload);
            }
        };

        this.worker.onerror = (e) => {
            console.error('Physics Worker Error:', e);
        };
    }

    init(config: any) {
        this.worker.postMessage({ type: 'INIT', payload: config });
    }

    step(dt: number, inputs: any) {
        this.worker.postMessage({ type: 'STEP', payload: { dt, ...inputs } });
    }

    command(type: string, payload: any) {
        this.worker.postMessage({ type: 'COMMAND', payload: { type, ...payload } });
    }

    getEntities(): Vessel[] {
        return this.viewEntities;
    }

    getMissionTime(): number {
        return this.latestState ? this.latestState.missionTime : 0;
    }

    getTrackedIndex(): number {
        return this.latestState ? this.latestState.trackedIndex : 0;
    }

    getFTSStatus(): any {
        return this.latestState ? this.latestState.fts : { state: 'SAFE', armTime: 0, enabled: true };
    }

    getEnvironmentState(): any {
        return this.latestState ? this.latestState.environment : null;
    }

    onEvent(callback: (event: any) => void) {
        this.eventListeners.push(callback);
    }

    private handleEvent(event: any) {
        this.eventListeners.forEach(cb => cb(event));
    }

    private syncView() {
        const latestInfo = this.latestState;
        if (!latestInfo) return;

        const workerEntities = latestInfo.entities;

        // Resize view array
        while (this.viewEntities.length > workerEntities.length) {
            this.viewEntities.pop();
        }

        for (let i = 0; i < workerEntities.length; i++) {
            const state = workerEntities[i];
            if (!state) continue;

            let view = this.viewEntities[i];

            // Check if view exists and matches type (including if undefined)
            if (!view || view.constructor.name !== state.type) {
                view = this.createViewEntity(state.type, state.x, state.y);
                this.viewEntities[i] = view;
            }

            // Sync properties (Visual & Physics for display)
            view.x = state.x;
            view.y = state.y;
            view.angle = state.angle;
            view.vx = state.vx;
            view.vy = state.vy;
            view.throttle = state.throttle;
            view.gimbalAngle = state.gimbalAngle;
            view.active = state.active;

            // Sync specific props if they exist on view instance
            if (state.engineState !== undefined) (view as any).engineState = state.engineState;
            if (state.ignitersRemaining !== undefined) (view as any).ignitersRemaining = state.ignitersRemaining;
            if (state.fuel !== undefined) view.fuel = state.fuel;
            if (state.fairingsDeployed !== undefined) (view as any).fairingsDeployed = state.fairingsDeployed;
        }
    }

    private createViewEntity(type: string, x: number, y: number): Vessel {
        switch (type) {
            case 'FullStack': return new FullStack(x, y);
            case 'Booster': return new Booster(x, y);
            case 'UpperStage': return new UpperStage(x, y);
            case 'Fairing': return new Fairing(x, y);
            case 'Payload': return new Payload(x, y);
            default: return new FullStack(x, y); // Fallback
        }
    }

    terminate() {
        this.worker.terminate();
    }
}
