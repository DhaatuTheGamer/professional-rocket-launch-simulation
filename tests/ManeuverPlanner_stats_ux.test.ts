
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManeuverPlanner } from '../src/ui/ManeuverPlanner';
import { Game } from '../src/core/Game';
import * as OrbitalMechanics from '../src/physics/OrbitalMechanics';

// Mock dependencies
vi.mock('../src/physics/OrbitalMechanics', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../src/physics/OrbitalMechanics')>();
    return {
        ...mod,
        calculateOrbitalElements: vi.fn().mockReturnValue({
             apoapsis: 200000,
             periapsis: 150000,
             period: 5400,
             eccentricity: 0.01,
             semiMajorAxis: 6571000
        }),
    };
});

describe('ManeuverPlanner UX Improvements', () => {
    let mockGame: Game;
    let planner: ManeuverPlanner;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';

        // Mock Game
        mockGame = {
            groundY: 1000,
            mainStack: {
                x: 0,
                y: 0,
                h: 0,
                vx: 7500,
                vy: 0,
                mass: 1000,
                maxThrust: 10000
            }
        } as unknown as Game;

        planner = new ManeuverPlanner(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have an aria-label on the close button', () => {
        // We need to access the private createModal method or just inspect the DOM since it's called in constructor
        const closeBtn = document.getElementById('planner-close-btn');
        expect(closeBtn).not.toBeNull();
        expect(closeBtn?.getAttribute('aria-label')).toBe('Close Maneuver Planner');
    });

    it('should use individual elements for stats instead of overwriting innerHTML', () => {
        planner.show();

        // Check if specific ID elements exist
        const apoEl = document.getElementById('planner-stat-apo');
        const periEl = document.getElementById('planner-stat-peri');
        const periodEl = document.getElementById('planner-stat-period');
        const eccEl = document.getElementById('planner-stat-ecc');

        expect(apoEl).not.toBeNull();
        expect(periEl).not.toBeNull();
        expect(periodEl).not.toBeNull();
        expect(eccEl).not.toBeNull();

        // Verify content
        expect(apoEl?.textContent).toContain('200.0 km');
        expect(periEl?.textContent).toContain('150.0 km');
        expect(periodEl?.textContent).toContain('90.0 min');
        expect(eccEl?.textContent).toContain('0.010');

        // Verify that updating stats updates the text content, not the element itself
        // (Simulate an update)
        // We can't easily verify "not replaced" without references, but we can verify it works.
        const originalApoEl = apoEl;

        // Trigger another update (which happens on interval, or we can force it)
        // Accessing private method via 'any' cast for testing
        (planner as any).updateOrbitStats();

        const newApoEl = document.getElementById('planner-stat-apo');
        expect(newApoEl).toBe(originalApoEl); // Should be the exact same DOM node
    });
});
