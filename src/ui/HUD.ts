/**
 * HUD
 *
 * Heads-Up Display controller.
 * Manages DOM elements overlaying the game canvas.
 */

import { Game } from '../core/Game';
import { UI_COLORS } from './UIConstants';
import { formatTimeOfDay, getWindDirectionString, EnvironmentState } from '../physics/Environment';
import { PIXELS_PER_METER } from '../config/Constants';

export class HUD {
    private game: Game;

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
        ignitersColor: '',

        // FTS
        ftsState: '',
        ftsStateColor: ''
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
    private hudFtsState: HTMLElement | null = null;

    constructor(game: Game) {
        this.game = game;
        this.initCache();
    }

    /**
     * Initialize HUD element cache
     */
    private initCache(): void {
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
        this.hudFtsState = document.getElementById('hud-fts-state');
    }

    /**
     * Update environment HUD elements
     */
    public updateEnvironment(envState: EnvironmentState): void {
        // Optimized: Use cached DOM elements to avoid expensive getElementById calls
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
            if (envState.maxQWindWarning !== last.maxQWarning) {
                last.maxQWarning = envState.maxQWindWarning;
                const hudMaxQ = this.hudMaxQ;
                if (hudMaxQ) {
                    if (envState.maxQWindWarning) {
                        hudMaxQ.textContent = '⚠ HIGH WIND SHEAR';
                        hudMaxQ.style.display = 'block';
                    } else {
                        hudMaxQ.style.display = 'none';
                    }
                }
            }
        }
    }

    /**
     * Draw heads-up display
     * Optimized: Uses cached DOM elements to avoid expensive getElementById calls every frame.
     */
    public update(): void {
        const trackedEntity = this.game.trackedEntity;
        if (!trackedEntity) return;

        const velAngle = Math.atan2(trackedEntity.vx, -trackedEntity.vy);
        this.game.navball.draw(trackedEntity.angle, velAngle);

        const alt = (this.game.groundY - trackedEntity.y - trackedEntity.h) / PIXELS_PER_METER;
        const vel = Math.sqrt(trackedEntity.vx ** 2 + trackedEntity.vy ** 2);

        // Apogee estimate
        const g = 9.8;
        const apogeeEst = alt + (trackedEntity.vy < 0 ? trackedEntity.vy ** 2 / (2 * g) : 0);

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
            const fuelPct = trackedEntity.fuel;
            // Only update if changed by more than 0.001
            if (Math.abs(last.fuelPct - fuelPct) > 0.001) {
                last.fuelPct = fuelPct;
                gaugeFuel.style.height = fuelPct * 100 + '%';
            }
        }

        if (gaugeThrust) {
            const thrustPct = trackedEntity.throttle;
            if (Math.abs(last.thrustPct - thrustPct) > 0.001) {
                last.thrustPct = thrustPct;
                gaugeThrust.style.height = thrustPct * 100 + '%';
            }
        }

        // Aerodynamic stability display
        if (hudAoa) {
            const aoaDeg = Math.abs((trackedEntity.aoa * 180) / Math.PI);
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
            const margin = trackedEntity.stabilityMargin;
            let stabStr: string;
            let color: string;

            if (trackedEntity.isAeroStable) {
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
            const tempC = Math.round(trackedEntity.skinTemp - 273.15);
            const tempStr = tempC + '°C';

            if (last.skinTemp !== tempStr) {
                last.skinTemp = tempStr;
                hudSkinTemp.textContent = tempStr;

                let color = UI_COLORS.GREEN;
                // Color coding based on temperature ratio to max
                if (trackedEntity.isThermalCritical) {
                    color = UI_COLORS.RED; // Red - critical
                } else if (tempC > 400) {
                    color = UI_COLORS.ORANGE; // Orange - warning
                } else if (tempC > 200) {
                    color = UI_COLORS.YELLOW; // Yellow - elevated
                }

                if (last.skinTempColor !== color) {
                    last.skinTempColor = color;
                    hudSkinTemp.style.color = color;
                }
            }
        }

        if (hudTpsStatus) {
            const shieldPct = Math.round(trackedEntity.heatShieldRemaining * 100);
            let statusStr: string;
            let color: string;

            if (shieldPct > 0) {
                statusStr = shieldPct + '%';
                if (trackedEntity.isAblating) {
                    color = UI_COLORS.ORANGE; // Orange when ablating
                } else if (shieldPct < 30) {
                    color = UI_COLORS.RED; // Red when low
                } else {
                    color = UI_COLORS.GREEN; // Green
                }
            } else {
                statusStr = 'N/A';
                color = UI_COLORS.GRAY; // Gray when no TPS
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
            const state = trackedEntity.engineState;
            let statusStr: string;
            let color: string;

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
            const count = trackedEntity.ignitersRemaining;
            if (last.igniters !== count) {
                last.igniters = count;
                hudIgniters.textContent = count.toString();

                let color: string;
                if (count === 0) {
                    color = UI_COLORS.RED; // Red - no restarts
                } else if (count === 1) {
                    color = UI_COLORS.ORANGE; // Orange - last one
                } else {
                    color = UI_COLORS.GREEN; // Green
                }

                if (last.ignitersColor !== color) {
                    last.ignitersColor = color;
                    hudIgniters.style.color = color;
                }
            }
        }

        // FTS Status display
        const hudFtsState = this.hudFtsState;
        if (hudFtsState) {
            const ftsStatus = this.game.fts.getStatus();
            let ftsStr: string = ftsStatus.state;
            let ftsColor = '';

            switch (ftsStatus.state) {
                case 'SAFE':
                    ftsColor = UI_COLORS.GREEN;
                    break;
                case 'WARNING':
                    ftsStr = `WARN ${(this.game.fts.config.warningDurationS - ftsStatus.warningTimer).toFixed(0)}s`;
                    ftsColor = UI_COLORS.YELLOW;
                    break;
                case 'ARM':
                    ftsStr = ftsStatus.armed ? 'ARMED' : 'ARM';
                    ftsColor = UI_COLORS.ORANGE;
                    break;
                case 'DESTRUCT':
                    ftsStr = 'DESTRUCT';
                    ftsColor = UI_COLORS.RED;
                    break;
            }

            if (last.ftsState !== ftsStr) {
                last.ftsState = ftsStr;
                hudFtsState.textContent = ftsStr;
            }

            if (last.ftsStateColor !== ftsColor) {
                last.ftsStateColor = ftsColor;
                hudFtsState.style.color = ftsColor;
            }
        }
    }
}
