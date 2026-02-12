
const perf = performance;

// Mock HTMLElement
class MockHTMLElement {
    private _textContent: string = '';
    private _style: any = { color: '', display: '', height: '0%' };

    get textContent(): string {
        return this._textContent;
    }

    set textContent(v: string) {
        this._textContent = v;
    }

    get style(): any {
        return this._style;
    }
}

// Mock document
const mockDocument = {
    elements: new Map<string, MockHTMLElement>(),
    getElementById: (id: string) => {
        if (!mockDocument.elements.has(id)) {
            mockDocument.elements.set(id, new MockHTMLElement());
        }
        return mockDocument.elements.get(id);
    }
};

// Global override (simulated for the test scope)
(globalThis as any).document = mockDocument;

// Mock Game class subset
class FullHUDUpdater {
    // Cache
    hudAlt: any = null;
    hudVel: any = null;
    hudApogee: any = null;
    gaugeFuel: any = null;
    gaugeThrust: any = null;
    hudAoa: any = null;
    hudStability: any = null;
    hudSkinTemp: any = null;
    hudTpsStatus: any = null;
    hudEngineStatus: any = null;
    hudIgniters: any = null;
    hudFtsState: any = null;

    lastHUDState = {
        alt: '',
        vel: '',
        apogee: '',
        fuelPct: -1,
        thrustPct: -1,
        aoa: '',
        aoaColor: '',
        stability: '',
        stabilityColor: '',
        skinTemp: '',
        skinTempColor: '',
        tpsStatus: '',
        tpsStatusColor: '',
        engineStatus: '',
        engineStatusColor: '',
        igniters: -1,
        ignitersColor: '',
        ftsState: '',
        ftsStateColor: ''
    };

    // Mock tracked entity
    trackedEntity = {
        y: 1000,
        h: 50,
        vx: 100,
        vy: 200,
        angle: 0.1,
        throttle: 1.0,
        fuel: 0.9,
        aoa: 0.05,
        stabilityMargin: 0.1,
        isAeroStable: true,
        skinTemp: 300,
        isThermalCritical: false,
        heatShieldRemaining: 1.0,
        isAblating: false,
        engineState: 'running',
        ignitersRemaining: 3
    };

    groundY = 10000;
    PIXELS_PER_METER = 10;
    UI_COLORS = {
        GREEN: '#2ecc71',
        RED: '#e74c3c',
        YELLOW: '#f1c40f',
        ORANGE: '#e67e22',
        GRAY: '#95a5a6'
    };

    // Mock FTS
    fts = {
        getStatus: () => ({ state: 'SAFE', armed: false, warningTimer: 0 }),
        config: { warningDurationS: 5 }
    };

    // Mock Navball (simplified)
    navball = {
        draw: (angle: number, velAngle: number) => {}
    };

    constructor() {
        this.initHUDCache();
    }

    initHUDCache() {
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

    // Inefficient method: Query elements every frame
    drawHUD_Inefficient() {
        if (!this.trackedEntity) return;

        const velAngle = Math.atan2(this.trackedEntity.vx, -this.trackedEntity.vy);
        this.navball.draw(this.trackedEntity.angle, velAngle);

        const alt = (this.groundY - this.trackedEntity.y - this.trackedEntity.h) / this.PIXELS_PER_METER;
        const vel = Math.sqrt(this.trackedEntity.vx ** 2 + this.trackedEntity.vy ** 2);
        const g = 9.8;
        const apogeeEst = alt + (this.trackedEntity.vy < 0 ? (this.trackedEntity.vy ** 2) / (2 * g) : 0);

        // Update DOM HUD (Inefficient)
        const hudAlt = document.getElementById('hud-alt');
        const hudVel = document.getElementById('hud-vel');
        const hudApogee = document.getElementById('hud-apogee');
        const gaugeFuel = document.getElementById('gauge-fuel');
        const gaugeThrust = document.getElementById('gauge-thrust');
        const hudAoa = document.getElementById('hud-aoa');
        const hudStability = document.getElementById('hud-stability');
        const hudSkinTemp = document.getElementById('hud-skin-temp');
        const hudTpsStatus = document.getElementById('hud-tps-status');
        const hudEngineStatus = document.getElementById('hud-engine-status');
        const hudIgniters = document.getElementById('hud-igniters');
        const hudFtsState = document.getElementById('hud-fts-state');

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

        // ... (Simulate other elements similarly)
        if (gaugeFuel) {
            gaugeFuel.style.height = (this.trackedEntity.fuel * 100) + '%';
        }

        // Assume other updates happen here... (keeping it balanced)
    }

    // Optimized method: Use cached elements
    drawHUD_Optimized() {
        if (!this.trackedEntity) return;

        const velAngle = Math.atan2(this.trackedEntity.vx, -this.trackedEntity.vy);
        this.navball.draw(this.trackedEntity.angle, velAngle);

        const alt = (this.groundY - this.trackedEntity.y - this.trackedEntity.h) / this.PIXELS_PER_METER;
        const vel = Math.sqrt(this.trackedEntity.vx ** 2 + this.trackedEntity.vy ** 2);
        const g = 9.8;
        const apogeeEst = alt + (this.trackedEntity.vy < 0 ? (this.trackedEntity.vy ** 2) / (2 * g) : 0);

        // Update DOM HUD (Optimized)
        const hudAlt = this.hudAlt;
        const hudVel = this.hudVel;
        const hudApogee = this.hudApogee;
        const gaugeFuel = this.gaugeFuel;
        const gaugeThrust = this.gaugeThrust;
        // ... other cached elements

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
            // Only update if changed by more than 0.001 (Optimization from source)
            if (Math.abs(last.fuelPct - fuelPct) > 0.001) {
                last.fuelPct = fuelPct;
                gaugeFuel.style.height = (fuelPct * 100) + '%';
            }
        }
    }
}

// Benchmark
const iterations = 100000; // 100k frames (approx 27 mins at 60fps)
const updater = new FullHUDUpdater();

console.log(`Running benchmark with ${iterations} iterations...`);

// Test Inefficient
const startInefficient = performance.now();
for (let i = 0; i < iterations; i++) {
    // Modify entity slightly to force updates
    updater.trackedEntity.y += (Math.random() - 0.5) * 10;
    updater.trackedEntity.vx += (Math.random() - 0.5);
    updater.drawHUD_Inefficient();
}
const endInefficient = performance.now();
const timeInefficient = endInefficient - startInefficient;

// Test Optimized
const startOptimized = performance.now();
for (let i = 0; i < iterations; i++) {
    updater.trackedEntity.y += (Math.random() - 0.5) * 10;
    updater.trackedEntity.vx += (Math.random() - 0.5);
    updater.drawHUD_Optimized();
}
const endOptimized = performance.now();
const timeOptimized = endOptimized - startOptimized;

console.log(`Inefficient: ${timeInefficient.toFixed(2)}ms`);
console.log(`Optimized:   ${timeOptimized.toFixed(2)}ms`);
console.log(`Improvement: ${(timeInefficient / timeOptimized).toFixed(2)}x faster`);
console.log(`Frame Budget Used (Optimized): ${(timeOptimized / iterations).toFixed(4)}ms per frame`);
