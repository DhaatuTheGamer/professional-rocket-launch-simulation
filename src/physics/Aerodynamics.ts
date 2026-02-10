/**
 * Aerodynamics Module
 * 
 * Advanced aerodynamic calculations for rocket stability analysis.
 * Implements Center of Pressure (CP) vs Center of Mass (CoM) physics,
 * Angle of Attack (AoA) calculations, and aerodynamic force computation.
 * 
 * Physics Reference:
 * - Stability: A rocket is statically stable when CP is behind CoM
 * - Lift: L = 0.5 * ρ * V² * Sref * CL(α)
 * - Drag: D = 0.5 * ρ * V² * Sref * (CD0 + CDi)
 * - Stability Margin = (CoM - CP) / Length (positive = stable)
 */

import { getAtmosphericDensity, getDynamicPressure } from '../constants';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Aerodynamic configuration for a vessel
 */
export interface AerodynamicsConfig {
    /** Reference area for coefficient calculations (m²) */
    referenceArea: number;
    
    /** Reference length for moment coefficients (m) */
    referenceLength: number;
    
    /** CP position as fraction from bottom (0 = bottom, 1 = top) */
    cpPositionFraction: number;

    /** CoM position as fraction from bottom when fully fueled */
    comPositionFullFraction: number;
    
    /** CoM position as fraction from bottom when empty */
    comPositionEmptyFraction: number;
    
    /** Normal force coefficient derivative per radian (≈2π for slender bodies) */
    cnAlpha: number;
    
    /** Zero-lift drag coefficient */
    cd0: number;
    
    /** Aspect ratio for induced drag calculation */
    aspectRatio: number;
}

/**
 * Current aerodynamic state of a vessel
 */
export interface AerodynamicState {
    /** Angle of Attack (radians) */
    aoa: number;
    
    /** Sideslip angle (radians) - for future 3D extension */
    sideslip: number;
    
    /** Center of Pressure position from bottom (meters) */
    cp: number;
    
    /** Center of Mass position from bottom (meters) */
    com: number;
    
    /** Stability margin: (CoM - CP) / length. Positive = stable */
    stabilityMargin: number;
    
    /** Whether the vehicle is aerodynamically stable (CP behind CoM) */
    isStable: boolean;
}

/**
 * Aerodynamic forces acting on a vessel
 */
export interface AerodynamicForces {
    /** Lift force perpendicular to velocity (N) */
    lift: number;
    
    /** Drag force opposite to velocity (N) */
    drag: number;
    
    /** Side force (N) - for future 3D extension */
    sideForce: number;
    
    /** Force components in body coordinates */
    forceX: number;
    forceY: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default aerodynamic configuration for a full rocket stack
 */
export const DEFAULT_AERO_CONFIG: AerodynamicsConfig = {
    referenceArea: 10.0,           // 10 m² reference area
    referenceLength: 50.0,         // 50 m reference length
    cpPositionFraction: 0.75,      // CP at 75% from bottom (near nose)
    comPositionFullFraction: 0.45, // CoM at 45% when full (lower, more stable)
    comPositionEmptyFraction: 0.55,// CoM at 55% when empty (higher, less stable)
    cnAlpha: 2 * Math.PI,          // Slender body theory
    cd0: 0.3,                      // Base drag coefficient
    aspectRatio: 0.5               // Typical rocket fineness ratio
};

/**
 * Aerodynamic configuration for booster (first stage)
 */
export const BOOSTER_AERO_CONFIG: AerodynamicsConfig = {
    referenceArea: 8.0,
    referenceLength: 40.0,
    cpPositionFraction: 0.70,
    comPositionFullFraction: 0.40,
    comPositionEmptyFraction: 0.50,
    cnAlpha: 2 * Math.PI,
    cd0: 0.35,
    aspectRatio: 0.4
};

/**
 * Aerodynamic configuration for upper stage
 */
export const UPPER_STAGE_AERO_CONFIG: AerodynamicsConfig = {
    referenceArea: 5.0,
    referenceLength: 20.0,
    cpPositionFraction: 0.60,
    comPositionFullFraction: 0.45,
    comPositionEmptyFraction: 0.50,
    cnAlpha: 2 * Math.PI,
    cd0: 0.25,
    aspectRatio: 0.6
};

/**
 * Aerodynamic configuration for payload/fairing
 */
export const PAYLOAD_AERO_CONFIG: AerodynamicsConfig = {
    referenceArea: 2.0,
    referenceLength: 5.0,
    cpPositionFraction: 0.50,      // Neutral stability
    comPositionFullFraction: 0.50,
    comPositionEmptyFraction: 0.50,
    cnAlpha: Math.PI,              // Less lift due to blunt shape
    cd0: 0.4,
    aspectRatio: 1.0
};

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate Angle of Attack (AoA)
 * 
 * AoA is the angle between the velocity vector and the body axis.
 * For a rocket, positive AoA means the nose is above the flight path.
 * 
 * @param vx - Horizontal velocity component (m/s)
 * @param vy - Vertical velocity component (m/s, negative = up in our coord system)
 * @param bodyAngle - Body orientation angle (radians, 0 = pointing up)
 * @returns Angle of attack in radians
 */
export function calculateAngleOfAttack(vx: number, vy: number, bodyAngle: number): number {
    const velocityMag = Math.sqrt(vx * vx + vy * vy);
    
    // At very low velocities, AoA is undefined/meaningless
    if (velocityMag < 1.0) {
        return 0;
    }
    
    // Calculate velocity vector angle (0 = pointing up in our coordinate system)
    // In our system: positive vy is down, positive vx is right
    const velocityAngle = Math.atan2(vx, -vy);
    
    // AoA is the difference between body angle and velocity angle
    let aoa = bodyAngle - velocityAngle;
    
    // Normalize to -π to +π
    while (aoa > Math.PI) aoa -= 2 * Math.PI;
    while (aoa < -Math.PI) aoa += 2 * Math.PI;
    
    return aoa;
}

/**
 * Calculate Center of Mass position based on fuel level
 * 
 * As fuel is consumed, the CoM typically moves upward (toward the nose)
 * because fuel tanks are usually located below the payload.
 * 
 * @param config - Aerodynamic configuration
 * @param fuelFraction - Current fuel level as fraction (0 = empty, 1 = full)
 * @param vehicleLength - Total vehicle length (meters)
 * @returns CoM position from bottom (meters)
 */
export function calculateCenterOfMass(
    config: AerodynamicsConfig,
    fuelFraction: number,
    vehicleLength: number
): number {
    // Linear interpolation between full and empty CoM positions
    const comFraction = config.comPositionEmptyFraction + 
        (config.comPositionFullFraction - config.comPositionEmptyFraction) * fuelFraction;
    
    return comFraction * vehicleLength;
}

/**
 * Calculate Center of Pressure position
 * 
 * CP position varies with Mach number and angle of attack, but for simplicity
 * we use a fixed position based on vehicle configuration. In a more advanced
 * model, CP would shift forward at supersonic speeds.
 * 
 * @param config - Aerodynamic configuration
 * @param vehicleLength - Total vehicle length (meters)
 * @param mach - Mach number (for future supersonic CP shift)
 * @returns CP position from bottom (meters)
 */
export function calculateCenterOfPressure(
    config: AerodynamicsConfig,
    vehicleLength: number,
    mach: number = 0
): number {
    // Basic CP position from configuration
    let cpFraction = config.cpPositionFraction;
    
    // Supersonic CP shift: CP moves forward (toward nose) at supersonic speeds
    // This makes the rocket less stable at high Mach
    if (mach > 1.0) {
        const supersonicShift = Math.min(0.1, (mach - 1.0) * 0.05);
        cpFraction = Math.min(0.95, cpFraction + supersonicShift);
    }
    
    return cpFraction * vehicleLength;
}

/**
 * Calculate the complete aerodynamic state
 * 
 * @param config - Aerodynamic configuration
 * @param vx - Horizontal velocity (m/s)
 * @param vy - Vertical velocity (m/s)
 * @param bodyAngle - Body orientation (radians)
 * @param fuelFraction - Fuel level (0-1)
 * @param vehicleLength - Vehicle length (meters)
 * @param mach - Mach number
 * @returns Complete aerodynamic state
 */
export function calculateAerodynamicState(
    config: AerodynamicsConfig,
    vx: number,
    vy: number,
    bodyAngle: number,
    fuelFraction: number,
    vehicleLength: number,
    mach: number
): AerodynamicState {
    const aoa = calculateAngleOfAttack(vx, vy, bodyAngle);
    const com = calculateCenterOfMass(config, fuelFraction, vehicleLength);
    const cp = calculateCenterOfPressure(config, vehicleLength, mach);
    
    // Stability margin: positive when CoM is ahead of (below) CP
    // We measure from bottom, so stable when com < cp
    const stabilityMargin = (cp - com) / vehicleLength;
    const isStable = stabilityMargin > 0;
    
    return {
        aoa,
        sideslip: 0, // 2D simulation, no sideslip
        cp,
        com,
        stabilityMargin,
        isStable
    };
}

/**
 * Calculate lift coefficient from angle of attack
 * 
 * Uses linearized aerodynamics for small angles.
 * CL = CNα * sin(α) * cos(α) ≈ CNα * α for small α
 * 
 * @param aoa - Angle of attack (radians)
 * @param cnAlpha - Normal force coefficient derivative
 * @returns Lift coefficient (dimensionless)
 */
export function calculateLiftCoefficient(aoa: number, cnAlpha: number): number {
    // Use full formula for better accuracy at higher AoA
    // Clamp AoA to prevent unrealistic values
    const clampedAoa = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, aoa));
    return cnAlpha * Math.sin(clampedAoa) * Math.cos(clampedAoa);
}

/**
 * Calculate drag coefficient including induced drag from lift
 * 
 * Total drag = Zero-lift drag + Induced drag
 * CD = CD0 + CL² / (π * e * AR)
 * where e ≈ 0.8 (Oswald efficiency factor)
 * 
 * @param cl - Lift coefficient
 * @param cd0 - Zero-lift drag coefficient
 * @param aspectRatio - Aspect ratio
 * @returns Total drag coefficient (dimensionless)
 */
export function calculateDragCoefficient(
    cl: number,
    cd0: number,
    aspectRatio: number
): number {
    const oswaldEfficiency = 0.8;
    const inducedDrag = (cl * cl) / (Math.PI * oswaldEfficiency * aspectRatio);
    return cd0 + inducedDrag;
}

/**
 * Calculate aerodynamic forces
 * 
 * Computes lift and drag forces from flight conditions and returns
 * them decomposed into body-axis forces for integration.
 * 
 * @param config - Aerodynamic configuration
 * @param aeroState - Current aerodynamic state
 * @param altitude - Current altitude (meters)
 * @param velocity - Velocity magnitude (m/s)
 * @param vx - Horizontal velocity component
 * @param vy - Vertical velocity component
 * @returns Aerodynamic forces
 */
export function calculateAerodynamicForces(
    config: AerodynamicsConfig,
    aeroState: AerodynamicState,
    altitude: number,
    velocity: number,
    vx: number,
    vy: number
): AerodynamicForces {
    // Get atmospheric density
    const rho = getAtmosphericDensity(altitude);
    
    // Dynamic pressure: q = 0.5 * ρ * V²
    const dynamicPressure = getDynamicPressure(rho, velocity);
    
    // Calculate coefficients
    const cl = calculateLiftCoefficient(aeroState.aoa, config.cnAlpha);
    const cd = calculateDragCoefficient(cl, config.cd0, config.aspectRatio);
    
    // Calculate force magnitudes
    // L = q * S * CL, D = q * S * CD
    const liftMagnitude = dynamicPressure * config.referenceArea * Math.abs(cl);
    const dragMagnitude = dynamicPressure * config.referenceArea * cd;
    
    // Calculate force directions
    // Drag is opposite to velocity
    // Lift is perpendicular to velocity (in the AoA direction)
    let forceX = 0;
    let forceY = 0;
    
    if (velocity > 1.0) {
        // Unit velocity vector
        const ux = vx / velocity;
        const uy = vy / velocity;
        
        // Drag force (opposite to velocity)
        forceX -= dragMagnitude * ux;
        forceY -= dragMagnitude * uy;
        
        // Lift force (perpendicular to velocity, in plane with body axis)
        // Lift direction is 90 degrees from velocity, toward body axis
        // For 2D: perpendicular vector is (-uy, ux) or (uy, -ux)
        // Choose direction based on sign of AoA
        const liftSign = aeroState.aoa > 0 ? 1 : -1;
        forceX += liftMagnitude * (-uy) * liftSign;
        forceY += liftMagnitude * ux * liftSign;
    }
    
    return {
        lift: liftMagnitude,
        drag: dragMagnitude,
        sideForce: 0, // 2D simulation
        forceX,
        forceY
    };
}

/**
 * Calculate stability-based damage rate
 * 
 * Vehicles that are unstable at high dynamic pressure experience
 * increased structural loading that can lead to failure.
 * 
 * @param aeroState - Current aerodynamic state
 * @param dynamicPressure - Current dynamic pressure (Pa)
 * @returns Damage rate per second (0-100 scale)
 */
export function calculateAerodynamicDamageRate(
    aeroState: AerodynamicState,
    dynamicPressure: number
): number {
    // No damage at low dynamic pressure
    if (dynamicPressure < 1000) {
        return 0;
    }
    
    // Damage increases with:
    // 1. Higher AoA (more aerodynamic loading)
    // 2. Negative stability margin (unstable configuration)
    // 3. Higher dynamic pressure
    
    const aoaFactor = Math.abs(aeroState.aoa);
    const stabilityFactor = aeroState.isStable ? 1.0 : (1.0 - aeroState.stabilityMargin * 2);
    const qFactor = dynamicPressure / 10000; // Normalize to ~1 at 10 kPa
    
    // Damage threshold: AoA > 0.2 rad (~11 degrees) at high Q
    if (aoaFactor < 0.1) {
        return 0;
    }
    
    // Calculate damage rate
    const damageRate = aoaFactor * stabilityFactor * qFactor * 50;
    
    // Cap maximum damage rate
    return Math.min(200, Math.max(0, damageRate));
}
