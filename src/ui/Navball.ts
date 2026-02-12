/**
 * Navball
 *
 * Attitude indicator (artificial horizon) display.
 * Shows vessel orientation and prograde/retrograde markers.
 * Inspired by KSP's navball.
 */

export class Navball {
    /** Canvas element */
    private canvas: HTMLCanvasElement | null;

    /** 2D rendering context */
    private ctx: CanvasRenderingContext2D | null;

    /** Canvas dimensions */
    private width: number;
    private height: number;

    constructor() {
        this.canvas = document.getElementById('navball') as HTMLCanvasElement | null;
        this.ctx = this.canvas?.getContext('2d') ?? null;
        this.width = this.canvas?.width ?? 140;
        this.height = this.canvas?.height ?? 140;
    }

    /**
     * Draw the navball
     *
     * @param angle - Vessel pitch angle (radians)
     * @param progradeAngle - Velocity vector angle (radians)
     */
    draw(angle: number, progradeAngle: number | null): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const r = this.width / 2 - 2;

        ctx.clearRect(0, 0, this.width, this.height);

        // Clip to circular area
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Rotate based on vessel angle
        ctx.translate(cx, cy);
        ctx.rotate(-angle);

        // Sky (blue)
        ctx.fillStyle = '#3498db';
        ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2);

        // Ground (purple)
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(-r * 2, 0, r * 4, r * 2);

        // Horizon line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 2, 0);
        ctx.lineTo(r * 2, 0);
        ctx.stroke();

        // Prograde marker
        if (progradeAngle !== null) {
            ctx.save();
            ctx.rotate(progradeAngle);
            ctx.translate(0, -r * 0.7);

            // Draw prograde symbol (circle with lines)
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            // Cross lines
            ctx.moveTo(0, -5);
            ctx.lineTo(0, -10);
            ctx.moveTo(0, 5);
            ctx.lineTo(0, 10);
            ctx.moveTo(-5, 0);
            ctx.lineTo(-10, 0);
            ctx.moveTo(5, 0);
            ctx.lineTo(10, 0);
            ctx.stroke();

            ctx.restore();
        }

        ctx.restore();

        // Fixed ship marker (orange chevron)
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 5);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx + 10, cy - 5);
        ctx.stroke();

        // Outer ring
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }
}
