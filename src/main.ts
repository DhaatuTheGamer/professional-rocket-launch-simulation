/**
 * Main Entry Point
 * 
 * Initializes the game and sets up UI event listeners.
 * This is the entry point for the bundled application.
 */

import { Game, performStaging } from './core/Game';
import { CONFIG, PIXELS_PER_METER } from './constants';
import { state } from './state';
import { SASModes } from './utils/SAS';
import { FullStack } from './physics/RocketComponents';

// Create and initialize game
const game = new Game();
game.init();

// ========================================
// UI/UX IMPROVEMENTS - Event Listeners
// ========================================

// Track flight phase for dynamic buttons
let flightPhase: 'prelaunch' | 'ascending' | 'descending' | 'landed' = 'prelaunch';

// --- IMPROVEMENT #7: Onboarding System ---
function showOnboarding(): void {
    if (localStorage.getItem('onboarding-complete')) return;
    const overlay = document.getElementById('tooltip-overlay');
    if (overlay) overlay.classList.add('visible');
}

document.getElementById('tooltip-dismiss')?.addEventListener('click', () => {
    const overlay = document.getElementById('tooltip-overlay');
    if (overlay) overlay.classList.remove('visible');
    localStorage.setItem('onboarding-complete', 'true');
});

// --- Splash Screen Buttons ---
document.getElementById('start-btn')?.addEventListener('click', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';
    game.missionLog.log("Mission Control Active", "info");
    showOnboarding();
});

document.getElementById('open-vab-btn')?.addEventListener('click', () => {
    const vab = document.getElementById('vab-modal');
    if (vab) vab.style.display = 'flex';
    updateVABStats();
});

// --- IMPROVEMENT #3: VAB Stats Calculation ---
function updateVABStats(): void {
    const fuelInput = document.getElementById('rng-fuel') as HTMLInputElement | null;
    const thrustInput = document.getElementById('rng-thrust') as HTMLInputElement | null;

    if (!fuelInput || !thrustInput) return;

    const fuelMass = parseFloat(fuelInput.value) * 1000; // kg
    const dryMass = 5000; // kg (fixed dry mass)
    const thrust = parseFloat(thrustInput.value) * 1000000; // N
    const isp = 300; // seconds (specific impulse)
    const g = 9.81;

    // Delta-V = Isp * g * ln(m0 / mf)
    const m0 = fuelMass + dryMass;
    const mf = dryMass;
    const deltaV = isp * g * Math.log(m0 / mf);

    // TWR = Thrust / (Weight) = Thrust / (m0 * g)
    const twr = thrust / (m0 * g);

    // Update display
    const dvElement = document.getElementById('vab-dv');
    const twrElement = document.getElementById('vab-twr');

    if (dvElement) {
        dvElement.textContent = Math.round(deltaV).toLocaleString();
        dvElement.className = 'vab-stat-value ' + (deltaV > 3000 ? 'good' : deltaV > 2000 ? 'warning' : 'bad');
    }
    if (twrElement) {
        twrElement.textContent = twr.toFixed(2);
        twrElement.className = 'vab-stat-value ' + (twr > 1.2 ? 'good' : twr > 1.0 ? 'warning' : 'bad');
    }
}

// VAB Slider Updates with Stats Recalculation
['rng-fuel', 'rng-thrust', 'rng-drag'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const valId = 'val-' + id.replace('rng-', '');
        const valElement = document.getElementById(valId);
        if (valElement) valElement.textContent = target.value;
        updateVABStats();
    });
});

// VAB Launch Button
document.getElementById('vab-launch-btn')?.addEventListener('click', () => {
    const fuelInput = document.getElementById('rng-fuel') as HTMLInputElement | null;
    const thrustInput = document.getElementById('rng-thrust') as HTMLInputElement | null;
    const dragInput = document.getElementById('rng-drag') as HTMLInputElement | null;

    if (fuelInput) CONFIG.FUEL_MASS = parseFloat(fuelInput.value) * 1000;
    if (thrustInput) CONFIG.MAX_THRUST_BOOSTER = parseFloat(thrustInput.value) * 1000000;
    if (dragInput) CONFIG.DRAG_COEFF = parseFloat(dragInput.value);

    const vabModal = document.getElementById('vab-modal');
    const splashScreen = document.getElementById('splash-screen');
    if (vabModal) vabModal.style.display = 'none';
    if (splashScreen) splashScreen.style.display = 'none';

    game.reset();
    game.missionLog.log("Custom Vehicle Configured", "info");
    showOnboarding();
});

// --- IMPROVEMENT #2: Dynamic Action Buttons ---
function updateActionButton(): void {
    const btn = document.getElementById('launch-btn');
    if (!btn || !game.trackedEntity) return;

    const alt = (state.groundY - game.trackedEntity.y - game.trackedEntity.h) / PIXELS_PER_METER;
    const vy = game.trackedEntity.vy;

    if (game.trackedEntity.throttle === 0 && alt < 100) {
        // Pre-launch
        btn.textContent = '🚀 INITIATE LAUNCH';
        btn.className = 'primary state-launch';
        flightPhase = 'prelaunch';
    } else if (vy < 0) {
        // Ascending
        btn.textContent = '🛑 ABORT MISSION';
        btn.className = 'primary state-abort';
        flightPhase = 'ascending';
    } else if (vy > 0 && alt > 1000) {
        // Descending from high altitude
        btn.textContent = '🦿 DEPLOY LEGS';
        btn.className = 'primary state-deploy';
        flightPhase = 'descending';
    }
}

// Launch/Abort/Deploy button
document.getElementById('launch-btn')?.addEventListener('click', () => {
    if (flightPhase === 'prelaunch' && game.mainStack?.throttle === 0) {
        game.mainStack.active = true;
        game.mainStack.throttle = 1.0;
        game.missionLog.log("IGNITION SEQUENCE START", "warn");
        updateActionButton();
    } else if (flightPhase === 'ascending') {
        // Abort - cut engines
        if (game.mainStack) game.mainStack.throttle = 0;
        game.missionLog.log("ABORT INITIATED", "warn");
    } else if (flightPhase === 'descending') {
        game.missionLog.log("LANDING LEGS DEPLOYED", "info");
    }
});

// --- IMPROVEMENT #9: Color-Coded Toggle Buttons ---
document.getElementById('autopilot-btn')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    state.autopilotEnabled = !state.autopilotEnabled;
    btn.textContent = state.autopilotEnabled ? '🤖 Auto-Land: ON' : '🤖 Auto-Land: OFF';
    btn.classList.toggle('enabled', state.autopilotEnabled);
});

document.getElementById('audio-btn')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    const muted = game.audio.toggleMute();
    btn.textContent = muted ? '🔇 Enable Audio' : '🔊 Disable Audio';
    btn.classList.remove('enabled', 'disabled');
    btn.classList.add(muted ? 'disabled' : 'enabled');
});

// --- IMPROVEMENT #4: SAS Control with Mode Indicator ---
document.querySelectorAll('.sas-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sas-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.id.replace('sas-', '').toUpperCase() as keyof typeof SASModes;
        const sasMode = SASModes[mode] ?? SASModes.OFF;
        game.sas.setMode(sasMode, game.trackedEntity?.angle ?? 0);

        // Update SAS mode indicator
        const modeText = document.getElementById('sas-mode-text');
        const modeIcons: Record<string, string> = {
            OFF: '⭕',
            STABILITY: '⚡',
            PROGRADE: '⬆️',
            RETROGRADE: '⬇️'
        };

        if (modeText) {
            modeText.textContent = mode;
            const iconEl = modeText.previousElementSibling;
            if (iconEl) iconEl.textContent = modeIcons[mode] ?? '🎯';
        }
    });
});

// --- IMPROVEMENT #10: Camera Mode Panel ---
document.querySelectorAll('#camera-panel button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#camera-panel button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const camMode = parseInt((btn as HTMLButtonElement).dataset.cam ?? '1');
        game.input.cameraMode = camMode;
        game.missionLog.log(`Camera: ${btn.textContent?.trim()}`, "info");
    });
});

// ========================================
// KEYBOARD SHORTCUTS
// ========================================
window.addEventListener('keydown', (e) => {
    // Prevent default for game keys
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
    }

    // SPACE - Launch or Stage
    if (e.key === ' ') {
        if (flightPhase === 'prelaunch' && game.mainStack?.throttle === 0) {
            // Initial ignition
            game.mainStack.active = true;
            game.mainStack.throttle = 1.0;
            game.missionLog.log("IGNITION SEQUENCE START", "warn");
            updateActionButton();
        } else if (flightPhase !== 'prelaunch') {
            // Staging
            performStaging(game);
        }
    }

    // S - Staging
    if (e.key === 's' || e.key === 'S') {
        performStaging(game);
    }

    // 1, 2, 3 - Camera modes
    if (e.key === '1') {
        document.querySelector<HTMLButtonElement>('#camera-panel button[data-cam="1"]')?.click();
    } else if (e.key === '2') {
        document.querySelector<HTMLButtonElement>('#camera-panel button[data-cam="2"]')?.click();
    } else if (e.key === '3') {
        document.querySelector<HTMLButtonElement>('#camera-panel button[data-cam="3"]')?.click();
    }

    // A - Toggle Autopilot
    if (e.key === 'a' || e.key === 'A') {
        document.getElementById('autopilot-btn')?.click();
    }
});

// Update action button periodically
setInterval(updateActionButton, 500);

// Export for debugging
(window as any).game = game;
