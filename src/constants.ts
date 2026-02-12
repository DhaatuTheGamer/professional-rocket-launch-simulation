/**
 * Physics Constants for Rocket Simulation
 *
 * All values use SI units:
 * - Distance: meters (m)
 * - Time: seconds (s)
 * - Force: Newtons (N)
 * - Mass: kilograms (kg)
 */

import type { PhysicsConfig } from './types';

// ============================================================================
// Fundamental Physical Constants
// ============================================================================

/** Standard gravitational acceleration at Earth's surface (m/s²) */
export const GRAVITY = 9.8;

/** Pixels per meter for screen rendering */
export const PIXELS_PER_METER = 10;

/** Target frames per second */
export const FPS = 60;

/** Fixed timestep for physics simulation (seconds) */
export const DT = 1 / FPS;

/** Atmospheric scale height for pressure calculations (meters) */
export const SCALE_HEIGHT = 7000;

/** Air density at sea level (kg/m³) */
export const RHO_SL = 1.225;

/** Earth radius (meters) */
export const R_EARTH = 6371000;

/** Speed of sound at sea level (m/s) - for Mach calculations */
export const SPEED_OF_SOUND = 340;

// ============================================================================
// Configurable Rocket Parameters
// ============================================================================

/**
 * Mutable configuration for rocket physics.
 * These can be modified by the VAB (Vehicle Assembly Building) UI.
 */
export const CONFIG: PhysicsConfig = {
    /** Booster stage max thrust (Newtons) - ~2 MN default */
    MAX_THRUST_BOOSTER: 2000000,

    /** Upper stage max thrust (Newtons) - 500 kN */
    MAX_THRUST_UPPER: 500000,

    /** Booster dry mass (kg) */
    MASS_BOOSTER: 40000,

    /** Upper stage dry mass (kg) */
    MASS_UPPER: 15000,

    /** Total fuel mass (kg) */
    FUEL_MASS: 30000,

    /** Aerodynamic drag coefficient (dimensionless) */
    DRAG_COEFF: 0.5,

    /** Booster specific impulse in vacuum (seconds) */
    ISP_VAC_BOOSTER: 311,

    /** Booster specific impulse at sea level (seconds) */
    ISP_SL_BOOSTER: 282,

    /** Upper stage specific impulse in vacuum (seconds) */
    ISP_VAC_UPPER: 348,

    /** Upper stage specific impulse at sea level (seconds) */
    ISP_SL_UPPER: 100
};

// ============================================================================
// Derived Constants
// ============================================================================

/**
 * Calculate atmospheric density at a given altitude
 * Uses exponential atmosphere model: ρ = ρ₀ * e^(-h/H)
 *
 * @param altitude - Altitude in meters
 * @returns Density in kg/m³
 */
export function getAtmosphericDensity(altitude: number): number {
    const safeAlt = Math.max(0, altitude);
    return RHO_SL * Math.exp(-safeAlt / SCALE_HEIGHT);
}

/**
 * Calculate gravitational acceleration at altitude
 * Uses inverse square law: g = g₀ * (R/(R+h))²
 *
 * @param altitude - Altitude in meters
 * @returns Gravitational acceleration in m/s²
 */
export function getGravity(altitude: number): number {
    const radius = R_EARTH + Math.max(0, altitude);
    return GRAVITY * Math.pow(R_EARTH / radius, 2);
}

/**
 * Calculate dynamic pressure (q)
 * q = 0.5 * ρ * v²
 *
 * @param density - Atmospheric density in kg/m³
 * @param velocity - Velocity in m/s
 * @returns Dynamic pressure in Pascals
 */
export function getDynamicPressure(density: number, velocity: number): number {
    return 0.5 * density * velocity * velocity;
}

/**
 * Calculate Mach number
 *
 * @param velocity - Velocity in m/s
 * @returns Mach number (dimensionless)
 */
export function getMachNumber(velocity: number): number {
    return velocity / SPEED_OF_SOUND;
}

/**
 * Get transonic drag multiplier based on Mach number
 * Drag increases significantly near Mach 1 (transonic regime)
 *
 * @param mach - Mach number
 * @returns Drag multiplier (1.0 to 2.5)
 */
export function getTransonicDragMultiplier(mach: number): number {
    if (mach > 0.8 && mach < 1.2) {
        return 2.5; // Transonic drag rise
    } else if (mach >= 1.2) {
        return 1.5; // Supersonic
    }
    return 1.0; // Subsonic
}
