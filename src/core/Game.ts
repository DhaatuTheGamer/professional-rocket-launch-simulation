/**
 * Game
 * 
 * Main game controller class.
 * Manages game loop, physics updates, rendering, and subsystems.
 */

import { CameraMode, MissionState, OrbitalElements, IVessel } from '../types';
import {
    CONFIG,
    PIXELS_PER_METER,
    R_EARTH,
    getAtmosphericDensity
} from '../constants';
import {
    state,
    updateDimensions,
    setAudioEngine,
    setMissionLog,
    setAssetLoader,
    addParticle
} from '../state';
import { InputManager } from './InputManager';
import { AudioEngine } from '../utils/AudioEngine';
import { AssetLoader } from '../utils/AssetLoader';
import { SAS, SASModes } from '../utils/SAS';
import { MissionLog } from '../ui/MissionLog';
import { Navball } from '../ui/Navball';
import { TelemetrySystem } from '../ui/Telemetry';
import { Particle } from '../physics/Particle';
import { FullStack, Booster, UpperStage, Payload, Fairing } from '../physics/RocketComponents';
import { FlightComputer } from '../guidance/FlightComputer';
import { BlackBoxRecorder } from '../telemetry/BlackBoxRecorder';
import { EnvironmentSystem, formatTimeOfDay, getWindDirectionString } from '../physics/Environment';
import { setWindVelocity, setDensityMultiplier } from '../state';
import { ManeuverPlanner } from '../ui/ManeuverPlanner';
import { MissionControl } from '../ui/MissionControl';
import { UI_COLORS } from '../ui/UIConstants';

export class Game {
    // Canvas and rendering
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    public groundY: number;

    // Subsystems
    public input: InputManager;
    public audio: AudioEngine;
    public assets: AssetLoader;
    public navball: Navball;
    public telemetry: TelemetrySystem;
    public missionLog: MissionLog;
    public sas: SAS;
    public flightComputer: FlightComputer;
    public blackBox: BlackBoxRecorder;
    public environment: EnvironmentSystem;
    public maneuverPlanner: ManeuverPlanner;
    public missionControl: MissionControl;

    // Game state
    public entities: IVessel[] = [];
    public particles: Particle[] = [];
    private cameraY: number = 0;
    private cameraMode: CameraMode = 'ROCKET';
    private cameraShakeX: number = 0;
    private cameraShakeY: number = 0;
    private timeScale: number = 1.0;

    // Tracked vessels
    public trackedEntity: IVessel | null = null;
    public mainStack: IVessel | null = null;
    public booster: Booster | null = null;
    public upperStage: UpperStage | null = null;

    // Mission state
    private missionState: MissionState = {
        liftoff: false,
        supersonic: false,
        maxq: false
    };

    // Timing
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly FIXED_DT: number = 1 / 60;
    public missionTime: number = 0;

    // Bloom effect (for engine glow)
    private bloomCanvas: HTMLCanvasElement;
    private bloomCtx: CanvasRenderingContext2D;

    // HUD state cache for minimizing DOM updates
    private lastHUDState = {
        // Environment
        windSpeed: -1,
        windDir: '',
        timeOfDay: '',
        launchStatus: '',
        maxQWarning: false,

        // Telemetry
        alt: '',
        vel: '',
        apogee: '',
        fuelPct: -1,
        thrustPct: -1,

        // Flight Data
        aoa: '',
        aoaColor: '',
        stability: '',
        stabilityColor: '',

        // TPS & Engine
        skinTemp: '',
        skinTempColor: '',
        tpsStatus: '',
        tpsStatusColor: '',
        engineStatus: '',
        engineStatusColor: '',
        igniters: -1,
        ignitersColor: ''
    };

    // HUD element cache
    private hudWindSpeed: HTMLElement | null = null;
    private hudWindDir: HTMLElement | null = null;
    private hudTimeOfDay: HTMLElement | null = null;
    private hudLaunchStatus: HTMLElement | null = null;
    private hudMaxQ: HTMLElement | null = null;
    private hudAlt: HTMLElement | null = null;
    private hudVel: HTMLElement | null = null;
    private hudApogee: HTMLElement | null = null;
    private gaugeFuel: HTMLElement | null = null;
    private gaugeThrust: HTMLElement | null = null;
    private hudAoa: HTMLElement | null = null;
    private hudStability: HTMLElement | null = null;
    private hudSkinTemp: HTMLElement | null = null;
    private hudTpsStatus: HTMLElement | null = null;
    private hudEngineStatus: HTMLElement | null = null;
    private hudIgniters: HTMLElement | null = null;

    constructor() {
        // Get canvas
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas element not found');
        this.canvas = canvas;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;

        // Set dimensions
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.groundY = this.height - 100;

        // Initialize subsystems
        this.input = new InputManager();
        this.audio = new AudioEngine();
        this.assets = new AssetLoader();
        this.navball = new Navball();
        this.telemetry = new TelemetrySystem();
        this.missionLog = new MissionLog();
        this.sas = new SAS();
        this.flightComputer = new FlightComputer(this.groundY);
        this.blackBox = new BlackBoxRecorder(this.groundY);
        this.environment = new EnvironmentSystem();
        this.maneuverPlanner = new ManeuverPlanner(this);
        this.missionControl = new MissionControl(this);

        // Bloom canvas for glow effects
        this.bloomCanvas = document.createElement('canvas');
        this.bloomCanvas.width = this.width / 4;
        this.bloomCanvas.height = this.height / 4;
        const bloomCtx = this.bloomCanvas.getContext('2d');
        if (!bloomCtx) throw new Error('Could not get bloom context');
        this.bloomCtx = bloomCtx;

        // Update global state
        updateDimensions(this.width, this.height, this.groundY);
        setAudioEngine(this.audio);
        setMissionLog(this.missionLog);
        setAssetLoader(this.assets);

        // Expose to window for legacy compatibility
        (window as any).state = state;
        (window as any).PIXELS_PER_METER = PIXELS_PER_METER;
        (window as any).R_EARTH = R_EARTH;
        (window as any).navball = this.navball;
        (window as any).missionLog = this.missionLog;
        (window as any).audio = this.audio;

        this.initHUDCache();
    }

    /**
     * Initialize HUD element cache
     */
    private initHUDCache(): void {
        this.hudWindSpeed = document.getElementById('hud-wind-speed');
        this.hudWindDir = document.getElementById('hud-wind-dir');
        this.hudTimeOfDay = document.getElementById('hud-time-of-day');
        this.hudLaunchStatus = document.getElementById('hud-launch-status');
        this.hudMaxQ = document.getElementById('hud-maxq-warning');
        this.hudAlt = document.getElementById('hud-alt');
        this.hudVel = document.getElementById('hud-vel');
        this.hudApogee = document.getElementById('hud-apogee');
        this.gaugeFuel = document.getElementById('gauge-fuel');
        this.gaugeThrust = document.getElementById('gauge-thrust');
        this.hudAoa = document.getElementById('hud-aoa');
        this.hudStability = document.getElementById('hud-stability');
        this.hudSkinTemp = document.getElementById('hud-skin-temp');
        this.hudTpsStatus = document.getElementById('hud-tps-status');
        this.hudEngineStatus = document.getElementById('hud-engine-status');
        this.hudIgniters = document.getElementById('hud-igniters');
    }

    /**
     * Initialize game
     */
    async init(): Promise<void> {
        // Audio requires user interaction
        document.addEventListener('click', () => {
            this.audio.resume();
            this.audio.init();
        }, { once: true });

        document.addEventListener('touchstart', () => {
            this.audio.resume();
            this.audio.init();
        }, { once: true });

        // Toggle Maneuver Planner with 'O'
        window.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                this.maneuverPlanner.toggle();
            }
        });

        // Load assets
        await this.assets.loadAll();

        // Reset game state
        this.reset();

        // Start game loop
        this.animate(0);
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        this.entities = [];
        this.particles = [];
        this.cameraY = 0;
        this.timeScale = 1;
        this.missionState = { liftoff: false, supersonic: false, maxq: false };

        // Create initial rocket
        const rocket = new FullStack(this.width / 2, this.groundY - 160);
        this.entities.push(rocket);
        this.mainStack = rocket;
        this.trackedEntity = rocket;

        // Update global state
        state.entities = this.entities as any;
        state.particles = [];

        // Legacy globals
        (window as any).mainStack = this.mainStack;
        (window as any).trackedEntity = this.trackedEntity;
        (window as any).booster = null;
        (window as any).upperStage = null;
    }

    /**
     * Physics update
     */
    private updatePhysics(dt: number): void {
        // Time warp controls
        if (this.input.actions.TIME_WARP_UP && this.timeScale < 100) {
            this.timeScale *= 1.1;
        }
        if (this.input.actions.TIME_WARP_DOWN && this.timeScale > 1) {
            this.timeScale *= 0.9;
        }

        // Map mode toggle
        if (this.input.actions.MAP_MODE) {
            this.cameraMode = this.cameraMode === 'MAP' ? 'ROCKET' : 'MAP';
            this.input.actions.MAP_MODE = false;
        }

        // Staging
        if (this.input.actions.STAGE) {
            // Staging is triggered via event listeners in main.ts
            // to ensure precise, one-shot execution outside the fixed-timestep physics loop.
            this.input.actions.STAGE = false;
        }

        const simDt = dt * this.timeScale;

        // Update environment system
        this.environment.update(simDt);

        // Update global wind state for tracked entity's altitude
        if (this.trackedEntity) {
            const alt = (this.groundY - this.trackedEntity.y - this.trackedEntity.h) / PIXELS_PER_METER;
            const envState = this.environment.getState(alt);
            setWindVelocity(envState.windVelocity);
            setDensityMultiplier(envState.densityMultiplier);

            // Update environment HUD
            this.updateEnvironmentHUD(envState);

            // Update Mission Control
            this.missionControl.update(simDt, this.missionTime);
        }

        // Control active vessel
        if (this.mainStack && this.mainStack.active) {
            // Flight Computer control (takes priority when active)
            if (this.flightComputer.isActive()) {
                const fcOutput = this.flightComputer.update(this.mainStack, simDt);

                // Apply pitch control via angle target
                if (fcOutput.pitchAngle !== null) {
                    // Flight computer controls pitch angle directly
                    // Use SAS in STABILITY mode to achieve target
                    const targetAngle = fcOutput.pitchAngle;
                    const angleError = targetAngle - this.mainStack.angle;
                    // Simple P-control for gimbal
                    this.mainStack.gimbalAngle = Math.max(-0.5, Math.min(0.5, angleError * 2));
                }

                // Apply throttle control
                if (fcOutput.throttle !== null) {
                    this.mainStack.throttle = fcOutput.throttle;
                }

                // Handle abort
                if (fcOutput.abort) {
                    this.mainStack.throttle = 0;
                    this.missionLog.log("FC: ABORT COMMAND", "warn");
                }
            } else {
                // Manual steering
                const steer = this.input.getSteering();

                if (Math.abs(steer) > 0.1) {
                    // Manual control
                    this.mainStack.gimbalAngle = steer * 0.4;
                } else if (this.sas.isActive()) {
                    // SAS control
                    const sasOut = this.sas.update(this.mainStack, simDt);
                    this.mainStack.gimbalAngle = sasOut;
                } else {
                    this.mainStack.gimbalAngle = 0;
                }
            }

            // Throttle (manual always works, even in FC mode for override)
            if (this.input.actions.THROTTLE_UP) {
                this.mainStack.throttle = Math.min(1, this.mainStack.throttle + 0.02 * this.timeScale);
            }
            if (this.input.actions.THROTTLE_DOWN) {
                this.mainStack.throttle = Math.max(0, this.mainStack.throttle - 0.02 * this.timeScale);
            }
            if (this.input.actions.CUT_ENGINE) {
                this.mainStack.throttle = 0;
            }
        }

        // Update entities
        this.entities.forEach(e => {
            e.applyPhysics(simDt, {});
            e.spawnExhaust(this.timeScale);
        });

        // Transfer particles from global state
        if (state.particles.length > 0) {
            this.particles.push(...(state.particles as Particle[]));
            state.particles = [];
        }

        // Mission events
        if (this.trackedEntity) {
            const alt = (this.groundY - this.trackedEntity.y - this.trackedEntity.h) / PIXELS_PER_METER;
            const vel = Math.sqrt(this.trackedEntity.vx ** 2 + this.trackedEntity.vy ** 2);
            const rho = getAtmosphericDensity(alt);

            this.audio.setThrust(this.trackedEntity.throttle, rho, vel);

            if (!this.missionState.liftoff && alt > 20) {
                this.missionState.liftoff = true;
                this.missionLog.log("LIFTOFF", "warn");
                this.audio.speak("Liftoff");
                // Auto-start black box recording on liftoff
                if (this.blackBox.getState() === 'idle') {
                    this.blackBox.start('Flight');
                }
            }

            // Record to black box
            if (this.missionState.liftoff) {
                this.missionTime += simDt;
                this.blackBox.record(this.trackedEntity, this.missionTime);
            }

            // Auto-stop black box on crash
            if (this.trackedEntity.crashed && this.blackBox.isRecording()) {
                this.blackBox.stop('crashed');
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p) {
                p.update(this.groundY, this.timeScale);
                if (p.isDead()) {
                    this.particles.splice(i, 1);
                }
            }
        }

        // Sync globals
        (window as any).trackedEntity = this.trackedEntity;
        (window as any).mainStack = this.mainStack;
    }

    /**
     * Update environment HUD elements
     */
    private updateEnvironmentHUD(envState: import('../physics/Environment').EnvironmentState): void {
        const hudWindSpeed = this.hudWindSpeed;
        const hudWindDir = this.hudWindDir;
        const hudTimeOfDay = this.hudTimeOfDay;
        const hudLaunchStatus = this.hudLaunchStatus;
        const last = this.lastHUDState;

        if (hudWindSpeed) {
            const speed = Math.round(envState.surfaceWindSpeed);
            if (last.windSpeed !== speed) {
                last.windSpeed = speed;
                hudWindSpeed.textContent = speed + ' m/s';

                // Color coding based on wind limits
                if (speed > 15) {
                    hudWindSpeed.style.color = UI_COLORS.RED;
                } else if (speed > 10) {
                    hudWindSpeed.style.color = UI_COLORS.YELLOW;
                } else {
                    hudWindSpeed.style.color = UI_COLORS.GREEN;
                }
            }
        }

        if (hudWindDir) {
            const dirStr = getWindDirectionString(envState.surfaceWindDirection);
            if (last.windDir !== dirStr) {
                last.windDir = dirStr;
                hudWindDir.textContent = dirStr;
            }
        }

        if (hudTimeOfDay) {
            const timeStr = formatTimeOfDay(envState.timeOfDay);
            if (last.timeOfDay !== timeStr) {
                last.timeOfDay = timeStr;
                hudTimeOfDay.textContent = timeStr;
            }
        }

        if (hudLaunchStatus) {
            const statusStr = envState.isLaunchSafe ? 'GO' : 'NO GO';

            if (last.launchStatus !== statusStr) {
                last.launchStatus = statusStr;
                hudLaunchStatus.textContent = statusStr;

                if (envState.isLaunchSafe) {
                    hudLaunchStatus.style.color = UI_COLORS.GREEN;
                    hudLaunchStatus.className = 'go-status';
                } else {
                    hudLaunchStatus.style.color = UI_COLORS.RED;
                    hudLaunchStatus.className = 'no-go-status';
                }
            }

            // Add Max-Q warning
            if (envState.maxQWindWarning && !last.maxQWarning) {
                last.maxQWarning = true;
                const hudMaxQ = this.hudMaxQ;
                if (hudMaxQ) {
                    hudMaxQ.textContent = '⚠ HIGH WIND SHEAR';
                    hudMaxQ.style.display = 'block';
                }
            }
        }
    }


    /**
     * Update orbit prediction paths
     */
    private updateOrbitPaths(now: number): void {
        this.entities.forEach(e => {
            if (e.crashed) return;

            const alt = (this.groundY - e.y - e.h) / PIXELS_PER_METER;
            let needsUpdate = false;

            if (e.throttle > 0) needsUpdate = true;
            if (alt < 140000) needsUpdate = true;
            if (now - e.lastOrbitUpdate > 1000) needsUpdate = true;
            if (!e.orbitPath) needsUpdate = true;

            if (needsUpdate) {
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
                const startR = R_EARTH + (this.groundY / 10 - simState.y - e.h / 10);
                e.orbitPath.push({ phi: startPhi, r: startR });

                for (let i = 0; i < 200; i++) {
                    const pAlt = this.groundY / 10 - simState.y - e.h / 10;
                    const pRad = pAlt + R_EARTH;
                    const pG = 9.8 * Math.pow(R_EARTH / pRad, 2);
                    const pFy = pG - (simState.vx ** 2) / pRad;

                    simState.vy += pFy * dtPred;
                    simState.x += simState.vx * dtPred;
                    simState.y += simState.vy * dtPred;

                    if (simState.y * 10 > this.groundY) break;

                    const pPhi = (simState.x * 10) / R_EARTH;
                    const pR = R_EARTH + (this.groundY / 10 - simState.y - e.h / 10);
                    e.orbitPath.push({ phi: pPhi, r: pR });
                }
            }
        });
    }

    /**
     * Draw the scene
     */
    private draw(): void {
        if (this.cameraMode === 'MAP') {
            this.drawMapView();
        } else {
            this.drawRocketView();
        }

        // Draw Mission Control Overlay
        this.missionControl.draw(this.ctx, this.width, this.height);
    }

    /**
     * Draw orbital map view
     */
    private drawMapView(): void {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        const scale = 0.00005;

        // Draw Earth
        const rEarthPx = R_EARTH * scale;
        this.ctx.fillStyle = '#3498db';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rEarthPx, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw vessels and orbits
        this.entities.forEach(e => {
            if (e.crashed) return;

            const alt = (this.groundY - e.y - e.h) / PIXELS_PER_METER;
            const r = R_EARTH + alt;
            const phi = e.x / R_EARTH;

            const ox = cx + Math.cos(phi - Math.PI / 2) * r * scale;
            const oy = cy + Math.sin(phi - Math.PI / 2) * r * scale;

            // Vessel dot
            this.ctx.fillStyle = e === this.trackedEntity ? '#f1c40f' : '#aaa';
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Orbit path
            if (e.orbitPath) {
                this.ctx.strokeStyle = this.ctx.fillStyle;
                this.ctx.beginPath();
                e.orbitPath.forEach((p, i) => {
                    const px = cx + Math.cos(p.phi - Math.PI / 2) * p.r * scale;
                    const py = cy + Math.sin(p.phi - Math.PI / 2) * p.r * scale;
                    if (i === 0) {
                        this.ctx.moveTo(px, py);
                    } else {
                        this.ctx.lineTo(px, py);
                    }
                });
                this.ctx.stroke();
            }
        });

        // Label
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px monospace';
        this.ctx.fillText("MAP MODE", 20, 40);
    }

    /**
     * Draw rocket flight view
     */
    private drawRocketView(): void {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Sky gradient
        const alt = -this.cameraY;
        const spaceRatio = Math.min(Math.max(alt / 60000, 0), 1);

        const grd = this.ctx.createLinearGradient(0, 0, 0, this.height);
        const rBot = Math.floor(135 * (1 - spaceRatio));
        const gBot = Math.floor(206 * (1 - spaceRatio));
        const bBot = Math.floor(235 * (1 - spaceRatio));
        const bTop = Math.floor(20 * (1 - spaceRatio));

        grd.addColorStop(0, `rgb(0, 0, ${bTop})`);
        grd.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);
        this.ctx.fillStyle = grd;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Camera follow
        if (this.trackedEntity) {
            let targetY = this.trackedEntity.y - this.height * 0.6;
            if (this.cameraMode === 'ROCKET') {
                targetY = this.trackedEntity.y - this.height / 2;
            }

            if (targetY < 0) {
                this.cameraY += (targetY - this.cameraY) * 0.1;
            } else {
                this.cameraY += (0 - this.cameraY) * 0.1;
            }

            // Camera shake from dynamic pressure
            const q = this.trackedEntity.q ?? 0;
            const shake = Math.min(q / 200, 10);
            this.cameraShakeX = (Math.random() - 0.5) * shake;
            this.cameraShakeY = (Math.random() - 0.5) * shake;
        }

        this.ctx.save();
        this.ctx.translate(this.cameraShakeX, -this.cameraY + this.cameraShakeY);

        // Ground
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(-50000, this.groundY, 100000, 500);

        // Particles
        Particle.drawParticles(this.ctx, this.particles);

        // Entities
        this.entities.forEach(e => e.draw(this.ctx, 0));

        this.ctx.restore();

        // HUD
        this.drawHUD();
    }

    /**
     * Draw heads-up display
     * Optimized: Uses cached DOM elements to avoid expensive getElementById calls every frame.
     */
    private drawHUD(): void {
        if (!this.trackedEntity) return;

        const velAngle = Math.atan2(this.trackedEntity.vx, -this.trackedEntity.vy);
        this.navball.draw(this.trackedEntity.angle, velAngle);

        const alt = (this.groundY - this.trackedEntity.y - this.trackedEntity.h) / PIXELS_PER_METER;
        const vel = Math.sqrt(this.trackedEntity.vx ** 2 + this.trackedEntity.vy ** 2);

        // Apogee estimate
        const g = 9.8;
        const apogeeEst = alt + (this.trackedEntity.vy < 0
            ? (this.trackedEntity.vy ** 2) / (2 * g)
            : 0);

        // Update DOM HUD
        const hudAlt = this.hudAlt;
        const hudVel = this.hudVel;
        const hudApogee = this.hudApogee;
        const gaugeFuel = this.gaugeFuel;
        const gaugeThrust = this.gaugeThrust;
        const hudAoa = this.hudAoa;
        const hudStability = this.hudStability;
        const last = this.lastHUDState;

        if (hudAlt) {
            const altStr = (alt / 1000).toFixed(1);
            if (last.alt !== altStr) {
                last.alt = altStr;
                hudAlt.textContent = altStr;
            }
        }

        if (hudVel) {
            const velStr = Math.floor(vel).toString();
            if (last.vel !== velStr) {
                last.vel = velStr;
                hudVel.textContent = velStr;
            }
        }

        if (hudApogee) {
            const apStr = (Math.max(alt, apogeeEst) / 1000).toFixed(1);
            if (last.apogee !== apStr) {
                last.apogee = apStr;
                hudApogee.textContent = apStr;
            }
        }

        if (gaugeFuel) {
            const fuelPct = this.trackedEntity.fuel;
            // Only update if changed by more than 0.001
            if (Math.abs(last.fuelPct - fuelPct) > 0.001) {
                last.fuelPct = fuelPct;
                gaugeFuel.style.height = (fuelPct * 100) + '%';
            }
        }

        if (gaugeThrust) {
             const thrustPct = this.trackedEntity.throttle;
             if (Math.abs(last.thrustPct - thrustPct) > 0.001) {
                 last.thrustPct = thrustPct;
                 gaugeThrust.style.height = (thrustPct * 100) + '%';
             }
        }

        // Aerodynamic stability display
        if (hudAoa) {
            const aoaDeg = Math.abs(this.trackedEntity.aoa * 180 / Math.PI);
            const aoaStr = aoaDeg.toFixed(1) + '°';

            if (last.aoa !== aoaStr) {
                last.aoa = aoaStr;
                hudAoa.textContent = aoaStr;

                // Color coding: green < 5°, yellow 5-15°, red > 15°
                let color = UI_COLORS.GREEN;
                if (aoaDeg > 15) {
                    color = UI_COLORS.RED;
                } else if (aoaDeg > 5) {
                    color = UI_COLORS.YELLOW;
                }

                if (last.aoaColor !== color) {
                    last.aoaColor = color;
                    hudAoa.style.color = color;
                }
            }
        }

        if (hudStability) {
            const margin = this.trackedEntity.stabilityMargin;
            let stabStr = '';
            let color = '';

            if (this.trackedEntity.isAeroStable) {
                stabStr = (margin * 100).toFixed(1) + '%';
                color = UI_COLORS.GREEN;
            } else {
                stabStr = 'UNSTABLE';
                color = UI_COLORS.RED;
            }

            if (last.stability !== stabStr) {
                last.stability = stabStr;
                hudStability.textContent = stabStr;
            }

            if (last.stabilityColor !== color) {
                last.stabilityColor = color;
                hudStability.style.color = color;
            }
        }

        // Thermal protection system display
        const hudSkinTemp = this.hudSkinTemp;
        const hudTpsStatus = this.hudTpsStatus;

        if (hudSkinTemp) {
            // Convert from Kelvin to Celsius
            const tempC = Math.round(this.trackedEntity.skinTemp - 273.15);
            const tempStr = tempC + '°C';

            if (last.skinTemp !== tempStr) {
                last.skinTemp = tempStr;
                hudSkinTemp.textContent = tempStr;

                let color = UI_COLORS.GREEN;
                // Color coding based on temperature ratio to max
                if (this.trackedEntity.isThermalCritical) {
                    color = UI_COLORS.RED;  // Red - critical
                } else if (tempC > 400) {
                    color = UI_COLORS.ORANGE;  // Orange - warning
                } else if (tempC > 200) {
                    color = UI_COLORS.YELLOW;  // Yellow - elevated
                }

                if (last.skinTempColor !== color) {
                    last.skinTempColor = color;
                    hudSkinTemp.style.color = color;
                }
            }
        }

        if (hudTpsStatus) {
            const shieldPct = Math.round(this.trackedEntity.heatShieldRemaining * 100);
            let statusStr = '';
            let color = '';

            if (shieldPct > 0) {
                statusStr = shieldPct + '%';
                if (this.trackedEntity.isAblating) {
                    color = UI_COLORS.ORANGE;  // Orange when ablating
                } else if (shieldPct < 30) {
                    color = UI_COLORS.RED;  // Red when low
                } else {
                    color = UI_COLORS.GREEN;  // Green
                }
            } else {
                statusStr = 'N/A';
                color = UI_COLORS.GRAY;  // Gray when no TPS
            }

            if (last.tpsStatus !== statusStr) {
                last.tpsStatus = statusStr;
                hudTpsStatus.textContent = statusStr;
            }

            if (last.tpsStatusColor !== color) {
                last.tpsStatusColor = color;
                hudTpsStatus.style.color = color;
            }
        }

        // Propulsion system display
        const hudEngineStatus = this.hudEngineStatus;
        const hudIgniters = this.hudIgniters;

        if (hudEngineStatus) {
            const state = this.trackedEntity.engineState;
            let statusStr = '';
            let color = '';

            switch (state) {
                case 'off':
                    statusStr = 'OFF';
                    color = UI_COLORS.GRAY;
                    break;
                case 'starting':
                    statusStr = 'SPOOL';
                    color = UI_COLORS.YELLOW;
                    break;
                case 'running':
                    statusStr = 'RUN';
                    color = UI_COLORS.GREEN;
                    break;
                case 'shutdown':
                    statusStr = 'STOP';
                    color = UI_COLORS.ORANGE;
                    break;
            }

            if (last.engineStatus !== statusStr) {
                last.engineStatus = statusStr;
                hudEngineStatus.textContent = statusStr;
            }

            if (last.engineStatusColor !== color) {
                last.engineStatusColor = color;
                hudEngineStatus.style.color = color;
            }
        }

        if (hudIgniters) {
            const count = this.trackedEntity.ignitersRemaining;
            if (last.igniters !== count) {
                last.igniters = count;
                hudIgniters.textContent = count.toString();

                let color = '';
                if (count === 0) {
                    color = UI_COLORS.RED;  // Red - no restarts
                } else if (count === 1) {
                    color = UI_COLORS.ORANGE;  // Orange - last one
                } else {
                    color = UI_COLORS.GREEN;  // Green
                }

                if (last.ignitersColor !== color) {
                    last.ignitersColor = color;
                    hudIgniters.style.color = color;
                }
            }
        }
    }

    /**
     * Main animation loop
     */
    private animate(currentTime: number): void {
        if (!this.lastTime) this.lastTime = currentTime;

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep physics
        while (this.accumulator >= this.FIXED_DT) {
            this.updatePhysics(this.FIXED_DT);
            if (this.cameraMode === 'MAP') {
                this.updateOrbitPaths(currentTime);
            }
            this.accumulator -= this.FIXED_DT;
        }

        this.draw();

        requestAnimationFrame((t) => this.animate(t));
    }
}

// Export staging function for use by main.ts
export function performStaging(game: Game): void {
    const lastStageTime = (window as any).lastStageTime ?? 0;
    if (Date.now() - lastStageTime < 1000) return;
    (window as any).lastStageTime = Date.now();

    if (!game.trackedEntity) return;

    if (game.trackedEntity instanceof FullStack) {
        game.missionLog.log("STAGING: S1 SEP", "warn");
        game.audio.playStaging();

        // Create staging particles
        for (let i = 0; i < 30; i++) {
            addParticle(new Particle(
                game.trackedEntity.x + (Math.random() - 0.5) * 20,
                game.trackedEntity.y + 80,
                'smoke',
                game.trackedEntity.vx + (Math.random() - 0.5) * 20,
                game.trackedEntity.vy + (Math.random() - 0.5) * 20
            ));
        }

        // Remove full stack
        game.entities = game.entities.filter(e => e !== game.trackedEntity);

        // Create booster
        game.booster = new Booster(
            game.trackedEntity.x,
            game.trackedEntity.y,
            game.trackedEntity.vx,
            game.trackedEntity.vy
        );
        game.booster.angle = game.trackedEntity.angle;
        game.booster.fuel = 0.05;
        game.booster.active = true;
        game.entities.push(game.booster);

        // Create upper stage
        game.upperStage = new UpperStage(
            game.trackedEntity.x,
            game.trackedEntity.y - 60,
            game.trackedEntity.vx,
            game.trackedEntity.vy + 2
        );
        game.upperStage.angle = game.trackedEntity.angle;
        game.upperStage.active = true;
        game.upperStage.throttle = 1.0;
        game.entities.push(game.upperStage);

        game.mainStack = game.upperStage;
        game.trackedEntity = game.upperStage;

        // Sync globals
        (window as any).mainStack = game.mainStack;
        (window as any).trackedEntity = game.trackedEntity;
        (window as any).booster = game.booster;

    } else if (game.trackedEntity instanceof UpperStage) {
        if (!(game.trackedEntity as UpperStage).fairingsDeployed) {
            // Fairing separation
            (game.trackedEntity as UpperStage).fairingsDeployed = true;
            game.missionLog.log("FAIRING SEP", "info");
            game.audio.playStaging();

            const fL = new Fairing(
                game.trackedEntity.x - 12,
                game.trackedEntity.y - 40,
                game.trackedEntity.vx - 10,
                game.trackedEntity.vy,
                -1
            );
            fL.angle = game.trackedEntity.angle - 0.5;
            game.entities.push(fL);

            const fR = new Fairing(
                game.trackedEntity.x + 12,
                game.trackedEntity.y - 40,
                game.trackedEntity.vx + 10,
                game.trackedEntity.vy,
                1
            );
            fR.angle = game.trackedEntity.angle + 0.5;
            game.entities.push(fR);
        } else {
            // Payload deployment
            game.missionLog.log("PAYLOAD DEP", "success");
            game.audio.playStaging();

            game.trackedEntity.active = false;
            game.trackedEntity.throttle = 0;

            const payload = new Payload(
                game.trackedEntity.x,
                game.trackedEntity.y - 20,
                game.trackedEntity.vx,
                game.trackedEntity.vy + 1
            );
            payload.angle = game.trackedEntity.angle;
            game.entities.push(payload);

            game.trackedEntity = payload;
            game.mainStack = payload;
            (window as any).trackedEntity = payload;
        }
    }

    // Update state
    state.entities = game.entities as any;
}
