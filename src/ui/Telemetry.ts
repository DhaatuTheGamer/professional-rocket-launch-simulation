/**
 * Telemetry System
 * 
 * Records and displays flight data over time.
 * Shows altitude and velocity graphs.
 */

import { TelemetryDataPoint } from '../types';

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

            // Limit data size
            if (this.data.length > this.maxDataPoints) {
                this.data.shift();
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

        if (this.data.length < 2) return;

        // Find max values for scaling
        const maxAlt = Math.max(...this.data.map(d => d.alt), 100);
        const maxVel = Math.max(...this.data.map(d => d.vel), 100);

        // Draw altitude line (green)
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.beginPath();

        this.data.forEach((d, i) => {
            const x = (i / (this.data.length - 1)) * w;
            const y = h - (d.alt / maxAlt) * h;

            if (i === 0) {
                this.ctx!.moveTo(x, y);
            } else {
                this.ctx!.lineTo(x, y);
            }
        });

        this.ctx.stroke();

        // Draw velocity line (blue)
        this.ctx.strokeStyle = '#3498db';
        this.ctx.beginPath();

        this.data.forEach((d, i) => {
            const x = (i / (this.data.length - 1)) * w;
            const y = h - (d.vel / maxVel) * h;

            if (i === 0) {
                this.ctx!.moveTo(x, y);
            } else {
                this.ctx!.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Clear all recorded data
     */
    clear(): void {
        this.data = [];
        this.lastSample = 0;
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
