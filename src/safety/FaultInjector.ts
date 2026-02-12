/**
 * Fault Injection System (FIS)
 *
 * Allows instructors to silently inject specific failures into the simulation
 * for training purposes. Supports immediate, timed, and conditional triggers.
 */

import { ReliabilitySystem, FailureType } from '../physics/Reliability';
import { IVessel } from '../types';
import { PIXELS_PER_METER } from '../constants';
import { state } from '../state';

// ============================================================================
// Types
// ============================================================================

export type FaultTriggerType = 'immediate' | 'timed' | 'conditional';
export type FaultCategory = 'propulsion' | 'avionics' | 'structure';
export type FaultStatus = 'ready' | 'armed' | 'injected';

export interface FaultDefinition {
    id: string;
    label: string;
    category: FaultCategory;
    description: string;
    failureType?: FailureType; // Maps to existing reliability failures
    customHandler?: string; // For custom fault effects (e.g., 'THROTTLE_STUCK', 'FUEL_LEAK')
}

interface ActiveFault {
    definition: FaultDefinition;
    status: FaultStatus;
    triggerType: FaultTriggerType;
    delay: number; // Seconds for timed trigger
    elapsed: number; // Time since armed
    condition?: (vessel: IVessel, alt: number) => boolean;
}

// ============================================================================
// Pre-built Fault Catalog
// ============================================================================

export const FAULT_CATALOG: FaultDefinition[] = [
    {
        id: 'engine-flameout',
        label: 'Engine Flameout',
        category: 'propulsion',
        description: 'Sudden loss of combustion',
        failureType: 'ENGINE_FLAME_OUT'
    },
    {
        id: 'engine-explosion',
        label: 'Engine Explosion',
        category: 'propulsion',
        description: 'Catastrophic engine failure',
        failureType: 'ENGINE_EXPLOSION'
    },
    {
        id: 'gimbal-lock',
        label: 'Gimbal Lock',
        category: 'propulsion',
        description: 'TVC actuator stuck in position',
        failureType: 'GIMBAL_LOCK'
    },
    {
        id: 'sensor-glitch',
        label: 'Sensor Glitch',
        category: 'avionics',
        description: 'Transient telemetry noise',
        failureType: 'SENSOR_GLITCH'
    },
    {
        id: 'structural-fatigue',
        label: 'Structural Failure',
        category: 'structure',
        description: 'Airframe stress failure',
        failureType: 'STRUCTURAL_FATIGUE'
    },
    {
        id: 'throttle-stuck',
        label: 'Throttle Stuck',
        category: 'propulsion',
        description: 'Throttle valve locked at current position',
        customHandler: 'THROTTLE_STUCK'
    },
    {
        id: 'fuel-leak',
        label: 'Fuel Leak',
        category: 'propulsion',
        description: 'Rapid propellant loss (10x drain rate)',
        customHandler: 'FUEL_LEAK'
    }
];

// ============================================================================
// Fault Injector
// ============================================================================

export class FaultInjector {
    private activeFaults: ActiveFault[] = [];
    private containerEl: HTMLElement | null = null;
    private _visible: boolean = false;

    // Custom fault states
    private _throttleStuck: boolean = false;
    private _throttleStuckValue: number = 0;
    private _fuelLeakActive: boolean = false;

    constructor(containerId?: string) {
        if (containerId && typeof document !== 'undefined') {
            this.containerEl = document.getElementById(containerId);
        }
    }

    /** Get whether a custom fault is active */
    get throttleStuck(): boolean {
        return this._throttleStuck;
    }
    get throttleStuckValue(): number {
        return this._throttleStuckValue;
    }
    get fuelLeakActive(): boolean {
        return this._fuelLeakActive;
    }

    /** Arm a fault for injection */
    armFault(faultId: string, triggerType: FaultTriggerType = 'immediate', delay: number = 0): void {
        const def = FAULT_CATALOG.find((f) => f.id === faultId);
        if (!def) return;

        // Remove existing instance of same fault
        this.activeFaults = this.activeFaults.filter((f) => f.definition.id !== faultId);

        this.activeFaults.push({
            definition: def,
            status: 'armed',
            triggerType,
            delay,
            elapsed: 0
        });

        this.render();
    }

    /** Inject a fault immediately */
    injectFault(faultId: string, vessel: IVessel, reliability: ReliabilitySystem): void {
        const fault = this.activeFaults.find((f) => f.definition.id === faultId);
        if (!fault || fault.status === 'injected') return;

        this.executeFault(fault, vessel, reliability);
    }

    /** Toggle a fault: first click arms, second click injects */
    toggleFault(faultId: string, vessel: IVessel, reliability: ReliabilitySystem): void {
        const existing = this.activeFaults.find((f) => f.definition.id === faultId);

        if (!existing) {
            // First click: arm
            this.armFault(faultId);
        } else if (existing.status === 'armed') {
            // Second click: inject immediately
            this.executeFault(existing, vessel, reliability);
        }
    }

    /** Execute a fault */
    private executeFault(fault: ActiveFault, vessel: IVessel, reliability: ReliabilitySystem): void {
        fault.status = 'injected';

        const def = fault.definition;

        // Standard reliability failure
        if (def.failureType) {
            reliability.triggerFailure(def.failureType);
        }

        // Custom handlers
        if (def.customHandler === 'THROTTLE_STUCK') {
            this._throttleStuck = true;
            this._throttleStuckValue = vessel.throttle;
            if (state.missionLog) {
                state.missionLog.log(`FIS: Throttle stuck at ${(this._throttleStuckValue * 100).toFixed(0)}%`, 'warn');
            }
        } else if (def.customHandler === 'FUEL_LEAK') {
            this._fuelLeakActive = true;
            if (state.missionLog) {
                state.missionLog.log('FIS: Fuel leak detected — rapid propellant loss', 'warn');
            }
        }

        this.render();
    }

    /** Update fault timers — call every physics tick */
    update(vessel: IVessel, reliability: ReliabilitySystem, groundY: number, dt: number): void {
        const alt = (groundY - vessel.y - vessel.h) / PIXELS_PER_METER;

        for (const fault of this.activeFaults) {
            if (fault.status !== 'armed') continue;

            // Timed trigger
            if (fault.triggerType === 'timed') {
                fault.elapsed += dt;
                if (fault.elapsed >= fault.delay) {
                    this.executeFault(fault, vessel, reliability);
                }
            }

            // Conditional trigger
            if (fault.triggerType === 'conditional' && fault.condition) {
                if (fault.condition(vessel, alt)) {
                    this.executeFault(fault, vessel, reliability);
                }
            }
        }

        // Apply ongoing custom effects
        if (this._throttleStuck && vessel.active) {
            vessel.throttle = this._throttleStuckValue;
        }

        if (this._fuelLeakActive && vessel.fuel > 0) {
            // Drain fuel at 10x normal rate
            vessel.fuel = Math.max(0, vessel.fuel - 0.01 * dt);
        }
    }

    /** Toggle panel visibility */
    toggle(): void {
        this._visible = !this._visible;
        if (this._visible) {
            this.render();
        }
        if (this.containerEl) {
            this.containerEl.style.display = this._visible ? 'block' : 'none';
        }
    }

    get visible(): boolean {
        return this._visible;
    }

    /** Reset all faults */
    reset(): void {
        this.activeFaults = [];
        this._throttleStuck = false;
        this._throttleStuckValue = 0;
        this._fuelLeakActive = false;
        this.render();
    }

    /** Render the FIS panel UI */
    render(): void {
        if (!this.containerEl) return;

        const categories: FaultCategory[] = ['propulsion', 'avionics', 'structure'];
        const categoryLabels: Record<FaultCategory, string> = {
            propulsion: '🔥 PROPULSION',
            avionics: '📡 AVIONICS',
            structure: '🏗️ STRUCTURE'
        };

        let html = `
            <div class="fis-inner">
                <div class="fis-header">
                    <h3>🎯 FAULT INJECTION SYSTEM</h3>
                    <span class="fis-badge">INSTRUCTOR ONLY</span>
                    <button class="fis-close" id="fis-close-btn">✕</button>
                </div>
                <div class="fis-hint">Click once to ARM, click again to INJECT</div>
        `;

        for (const cat of categories) {
            const faults = FAULT_CATALOG.filter((f) => f.category === cat);
            html += `
                <div class="fis-category">
                    <div class="fis-category-label">${categoryLabels[cat]}</div>
                    <div class="fis-fault-grid">
            `;

            for (const fault of faults) {
                const active = this.activeFaults.find((f) => f.definition.id === fault.id);
                const statusClass =
                    active?.status === 'injected' ? 'injected' : active?.status === 'armed' ? 'armed' : '';
                const statusLabel =
                    active?.status === 'injected' ? '⚡ ACTIVE' : active?.status === 'armed' ? '🔴 ARMED' : '';

                html += `
                    <button class="fis-fault-btn ${statusClass}" 
                            data-fault="${fault.id}"
                            title="${fault.description}">
                        <span class="fis-fault-name">${fault.label}</span>
                        ${statusLabel ? `<span class="fis-fault-status">${statusLabel}</span>` : ''}
                    </button>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += `
            </div>
        `;

        this.containerEl.innerHTML = html;

        // Wire button events
        this.containerEl.querySelectorAll('.fis-fault-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const faultId = target.dataset.fault;
                if (faultId) {
                    // Dispatch custom event — handled by main.ts
                    this.containerEl?.dispatchEvent(
                        new CustomEvent('fis-toggle', {
                            detail: { faultId },
                            bubbles: true
                        })
                    );
                }
            });
        });

        // Close button
        const closeBtn = this.containerEl.querySelector('#fis-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this._visible = false;
                if (this.containerEl) this.containerEl.style.display = 'none';
            });
        }
    }
}
