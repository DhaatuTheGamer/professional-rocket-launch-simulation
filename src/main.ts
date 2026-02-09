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
import { ScriptEditor } from './ui/ScriptEditor';
import { exportFlightData } from './telemetry/TelemetryExporter';
import { VABEditor } from './ui/VABEditor';
import { VehicleBlueprint, calculateStats } from './vab/VehicleBlueprint';

// Create and initialize game
const game = new Game();
game.init();

// Create Script Editor UI for Flight Computer
const scriptEditor = new ScriptEditor(game.flightComputer);

// Create VAB Editor with launch callback
const vabEditor = new VABEditor('vab-modal', (blueprint: VehicleBlueprint) => {
    // Apply blueprint stats to CONFIG for now (future: ModularVessel)
    const stats = calculateStats(blueprint);
    CONFIG.FUEL_MASS = stats.fuelMass;

    // Hide splash and reset
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) splashScreen.style.display = 'none';

    game.reset();
    game.missionLog.log(`${blueprint.name} configured - ΔV: ${stats.totalDeltaV.toFixed(0)} m/s`, "info");
    showOnboarding();
});

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
    vabEditor.show();
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

// --- Maneuver Planner Button ---
document.getElementById('maneuver-btn')?.addEventListener('click', () => {
    game.maneuverPlanner.toggle();
});

// --- Mission Control Button ---
document.getElementById('mission-control-btn')?.addEventListener('click', () => {
    game.missionControl.toggle();
});

// --- Flight Computer Button ---
document.getElementById('fc-btn')?.addEventListener('click', () => {
    scriptEditor.open();
});

// --- Flight Computer HUD Update ---
function updateFCStatus(): void {
    const fcStatus = document.getElementById('fc-status');
    if (!fcStatus) return;

    const isActive = game.flightComputer.isActive();
    const isStandby = game.flightComputer.state.mode !== 'OFF';

    if (isActive || isStandby) {
        fcStatus.classList.add('active');

        let modeDiv = fcStatus.querySelector('.fc-mode');
        if (!modeDiv) {
            modeDiv = document.createElement('div');
            modeDiv.className = 'fc-mode';
            fcStatus.appendChild(modeDiv);
        }
        modeDiv.textContent = game.flightComputer.getStatusString();

        let commandDiv = fcStatus.querySelector('.fc-command');
        if (isActive) {
            if (!commandDiv) {
                commandDiv = document.createElement('div');
                commandDiv.className = 'fc-command';
                fcStatus.appendChild(commandDiv);
            }
            commandDiv.textContent = game.flightComputer.getActiveCommandText();
        } else {
            if (commandDiv) {
                commandDiv.remove();
            }
        }
    } else {
        fcStatus.classList.remove('active');
        fcStatus.textContent = '';
    }
}

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

    // G - Toggle Flight Computer
    if (e.key === 'g' || e.key === 'G') {
        game.flightComputer.toggle();
        game.missionLog.log(`Flight Computer: ${game.flightComputer.getStatusString()}`, "info");

        // Update FC button state
        const fcBtn = document.getElementById('fc-btn');
        if (fcBtn) {
            fcBtn.classList.toggle('enabled', game.flightComputer.isActive());
        }
    }

    // F - Open Script Editor
    if (e.key === 'f' || e.key === 'F') {
        scriptEditor.open();
    }

    // R - Toggle Black Box Recording
    if (e.key === 'r' || e.key === 'R') {
        game.blackBox.toggle();
        const status = game.blackBox.getStatusString();
        game.missionLog.log(`Black Box: ${status || 'IDLE'}`, "info");
    }

    // E - Export Flight Data
    if (e.key === 'e' || e.key === 'E') {
        const frames = game.blackBox.getFrames();
        if (frames.length > 0) {
            exportFlightData(frames, game.blackBox.getSummary(), 'csv');
            game.missionLog.log(`Exported ${frames.length} frames to CSV`, "success");
        } else {
            game.missionLog.log("No flight data to export", "warn");
        }
    }
});

// Update action button periodically
setInterval(updateActionButton, 500);
setInterval(updateFCStatus, 100);

// Update Black Box status in HUD
function updateBlackBoxStatus(): void {
    const bbStatus = document.getElementById('bb-status');
    if (bbStatus) {
        const status = game.blackBox.getStatusString();
        bbStatus.textContent = status;
        bbStatus.classList.toggle('recording', game.blackBox.isRecording());
    }
}
setInterval(updateBlackBoxStatus, 200);

// Export button handler
document.getElementById('export-btn')?.addEventListener('click', () => {
    const frames = game.blackBox.getFrames();
    if (frames.length > 0) {
        exportFlightData(frames, game.blackBox.getSummary(), 'csv');
        game.missionLog.log(`Exported ${frames.length} frames to CSV`, "success");
    } else {
        game.missionLog.log("No flight data to export", "warn");
    }
});

// Export for debugging
(window as any).game = game;
(window as any).scriptEditor = scriptEditor;
