/**
 * Global State Container
 * 
 * Legacy compatibility layer for global state access.
 * In a fully refactored codebase, this would be replaced with
 * proper dependency injection or a state management pattern.
 */

import { GameState, IVessel, IParticle, IAudioEngine, IMissionLog, IAssetLoader, Vector2D, vec2 } from './types';

/**
 * Global simulation state
 * @deprecated Use Game class properties instead where possible
 */
export const state: GameState = {
    groundY: 0,
    width: 0,
    height: 0,
    entities: [],
    particles: [],
    audio: null,
    missionLog: null,
    autopilotEnabled: false,
    assets: undefined
};

/**
 * Current wind velocity at various altitudes - updated by EnvironmentSystem
 * This is used by Vessel.ts for aerodynamic calculations
 */
export let currentWindVelocity: Vector2D = vec2(0, 0);
export let currentDensityMultiplier: number = 1.0;

export function setWindVelocity(wind: Vector2D): void {
    currentWindVelocity = wind;
}

export function setDensityMultiplier(mult: number): void {
    currentDensityMultiplier = mult;
}

/**
 * Reset state to initial values
 */
export function resetState(): void {
    state.entities = [];
    state.particles = [];
    state.autopilotEnabled = false;
}

/**
 * Update state dimensions
 */
export function updateDimensions(width: number, height: number, groundY: number): void {
    state.width = width;
    state.height = height;
    state.groundY = groundY;
}

/**
 * Set audio engine reference
 */
export function setAudioEngine(audio: IAudioEngine): void {
    state.audio = audio;
}

/**
 * Set mission log reference
 */
export function setMissionLog(log: IMissionLog): void {
    state.missionLog = log;
}

/**
 * Set asset loader reference
 */
export function setAssetLoader(loader: IAssetLoader): void {
    state.assets = loader;
}

/**
 * Add entity to simulation
 */
export function addEntity(entity: IVessel): void {
    state.entities.push(entity);
}

/**
 * Remove entity from simulation
 */
export function removeEntity(entity: IVessel): void {
    const index = state.entities.indexOf(entity);
    if (index > -1) {
        state.entities.splice(index, 1);
    }
}

/**
 * Add particle to simulation
 */
export function addParticle(particle: IParticle): void {
    state.particles.push(particle);
}

/**
 * Clear all particles
 */
export function clearParticles(): void {
    state.particles = [];
}
