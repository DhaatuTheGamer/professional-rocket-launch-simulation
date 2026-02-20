/**
 * Telemetry System
 *
 * Records and displays flight data over time.
 * Shows altitude and velocity graphs.
 */

import type { TelemetryDataPoint } from '../types/index.ts';
import { Deque } from '../utils/Deque.ts';

export class TelemetrySystem {
    /** Canvas element */
    private canvas: HTMLCanvasElement | null;

    /** 2D rendering context */
    private ctx: CanvasRenderingContext2D | null;

    /** Recorded data points */
    private data: Deque<TelemetryDataPoint>;

    /** Maximum number of data points to store */
    private readonly maxDataPoints: number = 300;

    /** Last sample time */
    private lastSample: number = 0;

    /** Sample interval (seconds) */
    private readonly sampleInterval: number = 0.1;

    /** Cached max values for scaling */
    private maxAlt: number = 100;
    private maxVel: number = 100;

    /** Monotonic queues for O(1) max retrieval */
    private maxAltDeque: Deque<number>;
    private maxVelDeque: Deque<number>;

    constructor() {
        this.canvas = document.getElementById('graph-canvas') as HTMLCanvasElement | null;
        this.ctx = this.canvas?.getContext('2d') ?? null;

        // Initialize with capacity slightly larger than maxDataPoints to avoid frequent resizing
        // But Deque handles resizing automatically.
        // Initial capacity 300 is good.
        this.data = new Deque<TelemetryDataPoint>(this.maxDataPoints + 16);
        this.maxAltDeque = new Deque<number>(this.maxDataPoints + 16);
        this.maxVelDeque = new Deque<number>(this.maxDataPoints + 16);
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
            // Update monotonic queues for altitude
            // Remove elements from back that are smaller than current
            while (this.maxAltDeque.size() > 0 && this.maxAltDeque.peekBack()! < alt) {
                this.maxAltDeque.pop();
            }
            this.maxAltDeque.push(alt);

            // Update monotonic queues for velocity
            while (this.maxVelDeque.size() > 0 && this.maxVelDeque.peekBack()! < vel) {
                this.maxVelDeque.pop();
            }
            this.maxVelDeque.push(vel);

            this.data.push({ t: time, alt, vel });

            // Limit data size
            if (this.data.size() > this.maxDataPoints) {
                const removed = this.data.shift();

                if (removed) {
                    // Check against front of deque (max value)
                    if (removed.alt === this.maxAltDeque.peekFront()) {
                        this.maxAltDeque.shift();
                    }
                    if (removed.vel === this.maxVelDeque.peekFront()) {
                        this.maxVelDeque.shift();
                    }
                }
            }

            // Update cached max values
            // Use 100 as minimum scale
            this.maxAlt = Math.max(100, this.maxAltDeque.peekFront() ?? 0);
            this.maxVel = Math.max(100, this.maxVelDeque.peekFront() ?? 0);

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

        const len = this.data.size();
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
            const d = this.data.get(i);
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
            const d = this.data.get(i);
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
        this.data.clear();
        this.maxAltDeque.clear();
        this.maxVelDeque.clear();
        this.lastSample = 0;
        this.maxAlt = 100;
        this.maxVel = 100;
    }

    /**
     * Get current data
     */
    getData(): readonly TelemetryDataPoint[] {
        return this.data.toArray();
    }

    /**
     * Get latest data point
     */
    getLatest(): TelemetryDataPoint | undefined {
        return this.data.peekBack();
    }
}
