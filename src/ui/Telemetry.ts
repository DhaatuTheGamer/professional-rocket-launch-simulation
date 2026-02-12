/**
 * Telemetry System
 *
 * Records and displays flight data over time.
 * Shows altitude and velocity graphs.
 */

import type { TelemetryDataPoint } from '../types/index.ts';

export class TelemetrySystem {
    /** Canvas element */
    private canvas: HTMLCanvasElement | null;

    /** 2D rendering context */
    private ctx: CanvasRenderingContext2D | null;

    /** Recorded data points */
    private data: TelemetryDataPoint[] = [];

    /** Maximum number of data points to store */
    private readonly maxDataPoints: number = 300;

    /** Last sample time */
    private lastSample: number = 0;

    /** Sample interval (seconds) */
    private readonly sampleInterval: number = 0.1;

    /** Cached max values for scaling */
    private maxAlt: number = 100;
    private maxVel: number = 100;

    constructor() {
        this.canvas = document.getElementById('graph-canvas') as HTMLCanvasElement | null;
        this.ctx = this.canvas?.getContext('2d') ?? null;
    }

    /**
     * Update telemetry with new data point
     *
     * @param time - Current time (seconds)
     * @param alt - Altitude (meters)
     * @param vel - Velocity (m/s)
     */
    update(time: number, alt: number, vel: number): void {
        // Throttle sampling
        if (time - this.lastSample > this.sampleInterval) {
            this.data.push({ t: time, alt, vel });

            // Update cached max values
            if (alt > this.maxAlt) this.maxAlt = alt;
            if (vel > this.maxVel) this.maxVel = vel;

            // Limit data size
            if (this.data.length > this.maxDataPoints) {
                const removed = this.data.shift();

                // If removed value was the max, we need to find the new max
                if (removed) {
                    if (removed.alt === this.maxAlt) {
                        this.maxAlt = 100;
                        for (const d of this.data) {
                            if (d.alt > this.maxAlt) this.maxAlt = d.alt;
                        }
                    }
                    if (removed.vel === this.maxVel) {
                        this.maxVel = 100;
                        for (const d of this.data) {
                            if (d.vel > this.maxVel) this.maxVel = d.vel;
                        }
                    }
                }
            }

            this.lastSample = time;
        }
    }

    /**
     * Draw telemetry graphs
     */
    draw(): void {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        const len = this.data.length;
        if (len < 2) return;

        // Draw altitude line (green)
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.beginPath();

        const maxAlt = this.maxAlt;
        const maxVel = this.maxVel;
        const xStep = w / (len - 1);
        const yAltScale = h / maxAlt;

        for (let i = 0; i < len; i++) {
            const d = this.data[i];
            if (!d) continue;
            const x = i * xStep;
            const y = h - d.alt * yAltScale;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        // Draw velocity line (blue)
        this.ctx.strokeStyle = '#3498db';
        this.ctx.beginPath();

        const yVelScale = h / maxVel;

        for (let i = 0; i < len; i++) {
            const d = this.data[i];
            if (!d) continue;
            const x = i * xStep;
            const y = h - d.vel * yVelScale;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    /**
     * Clear all recorded data
     */
    clear(): void {
        this.data = [];
        this.lastSample = 0;
        this.maxAlt = 100;
        this.maxVel = 100;
    }

    /**
     * Get current data
     */
    getData(): readonly TelemetryDataPoint[] {
        return this.data;
    }

    /**
     * Get latest data point
     */
    getLatest(): TelemetryDataPoint | undefined {
        return this.data[this.data.length - 1];
    }
}
