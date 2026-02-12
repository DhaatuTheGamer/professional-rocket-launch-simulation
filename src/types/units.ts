/**
 * Branded Unit Types for Physics Simulation
 *
 * These types provide compile-time safety to prevent unit mixing errors.
 * For example, you cannot accidentally add Meters to Feet, or pass
 * a Newtons value where Kilograms is expected.
 *
 * Usage:
 *   const altitude: Meters = 1000 as Meters;
 *   const force: Newtons = 2000000 as Newtons;
 *
 * The compiler will catch:
 *   const wrong: Meters = force;  // Error!
 */

// ============================================================================
// Distance Units
// ============================================================================

/**
 * Distance in meters (SI unit)
 */
export type Meters = number & { readonly __brand: unique symbol };

/**
 * Distance in kilometers
 */
export type Kilometers = number & { readonly __brand: unique symbol };

/**
 * Distance in pixels (screen space)
 */
export type Pixels = number & { readonly __brand: unique symbol };

// ============================================================================
// Time Units
// ============================================================================

/**
 * Time in seconds (SI unit)
 */
export type Seconds = number & { readonly __brand: unique symbol };

/**
 * Time in milliseconds
 */
export type Milliseconds = number & { readonly __brand: unique symbol };

// ============================================================================
// Force & Mass Units
// ============================================================================

/**
 * Force in Newtons (SI unit)
 */
export type Newtons = number & { readonly __brand: unique symbol };

/**
 * Mass in kilograms (SI unit)
 */
export type Kilograms = number & { readonly __brand: unique symbol };

/**
 * Pressure in Pascals (N/m²)
 */
export type Pascals = number & { readonly __brand: unique symbol };

/**
 * Dynamic pressure (0.5 * rho * v²)
 */
export type DynamicPressure = number & { readonly __brand: unique symbol };

// ============================================================================
// Velocity Units
// ============================================================================

/**
 * Velocity in meters per second (SI unit)
 */
export type MetersPerSecond = number & { readonly __brand: unique symbol };

/**
 * Acceleration in meters per second squared
 */
export type MetersPerSecondSquared = number & { readonly __brand: unique symbol };

// ============================================================================
// Angle Units
// ============================================================================

/**
 * Angle in radians
 */
export type Radians = number & { readonly __brand: unique symbol };

/**
 * Angle in degrees
 */
export type Degrees = number & { readonly __brand: unique symbol };

// ============================================================================
// Density Units
// ============================================================================

/**
 * Density in kg/m³
 */
export type KgPerCubicMeter = number & { readonly __brand: unique symbol };

// ============================================================================
// Specific Impulse
// ============================================================================

/**
 * Specific impulse in seconds
 * (Yes, Isp is measured in seconds - it's the impulse per unit weight of propellant)
 */
export type SpecificImpulse = number & { readonly __brand: unique symbol };

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Unit conversion utilities with type safety
 */
export const Units = {
    // Distance conversions
    metersToKilometers: (m: Meters): Kilometers => (m / 1000) as Kilometers,
    kilometersToMeters: (km: Kilometers): Meters => (km * 1000) as Meters,
    metersToPixels: (m: Meters, scale: number): Pixels => (m * scale) as Pixels,
    pixelsToMeters: (px: Pixels, scale: number): Meters => (px / scale) as Meters,

    // Angle conversions
    radiansToDesgrees: (rad: Radians): Degrees => ((rad * 180) / Math.PI) as Degrees,
    degreesToRadians: (deg: Degrees): Radians => ((deg * Math.PI) / 180) as Radians,

    // Time conversions
    secondsToMilliseconds: (s: Seconds): Milliseconds => (s * 1000) as Milliseconds,
    millisecondsToSeconds: (ms: Milliseconds): Seconds => (ms / 1000) as Seconds,

    // Create branded values (explicit casting)
    meters: (value: number): Meters => value as Meters,
    kilometers: (value: number): Kilometers => value as Kilometers,
    pixels: (value: number): Pixels => value as Pixels,
    seconds: (value: number): Seconds => value as Seconds,
    newtons: (value: number): Newtons => value as Newtons,
    kilograms: (value: number): Kilograms => value as Kilograms,
    radians: (value: number): Radians => value as Radians,
    degrees: (value: number): Degrees => value as Degrees,
    metersPerSecond: (value: number): MetersPerSecond => value as MetersPerSecond,
    kgPerCubicMeter: (value: number): KgPerCubicMeter => value as KgPerCubicMeter,
    isp: (value: number): SpecificImpulse => value as SpecificImpulse
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Runtime check (always returns true, but provides type narrowing)
 * Useful when interfacing with untyped external data
 */
export function asMeters(value: number): Meters {
    return value as Meters;
}

export function asNewtons(value: number): Newtons {
    return value as Newtons;
}

export function asKilograms(value: number): Kilograms {
    return value as Kilograms;
}

export function asRadians(value: number): Radians {
    return value as Radians;
}

export function asSeconds(value: number): Seconds {
    return value as Seconds;
}
