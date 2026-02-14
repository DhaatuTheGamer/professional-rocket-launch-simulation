
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManeuverPlanner } from '../src/ui/ManeuverPlanner';
import { Game } from '../src/core/Game';
import * as OrbitalMechanics from '../src/physics/OrbitalMechanics';

// Mock dependencies
vi.mock('../src/physics/OrbitalMechanics', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../src/physics/OrbitalMechanics')>();
    return {
        ...mod,
        calculateHohmannTransfer: vi.fn(),
    };
});

describe('ManeuverPlanner Security', () => {
    let container: HTMLElement;
    let mockGame: Game;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);

        // Mock Game
        mockGame = {
            groundY: 0,
            mainStack: {
                x: 0,
                y: 1000,
                h: 10,
                vx: 100,
                vy: 0,
                mass: 1000,
                maxThrust: 10000
            }
        } as unknown as Game;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should NOT be vulnerable to XSS via error messages', () => {
        const planner = new ManeuverPlanner(mockGame);

        // Mock calculateHohmannTransfer to throw an error with HTML payload
        const maliciousPayload = '<img src=x onerror=alert(1)>';
        vi.spyOn(OrbitalMechanics, 'calculateHohmannTransfer').mockImplementation(() => {
            throw new Error(maliciousPayload);
        });

        // Initialize modal
        planner.show();

        // Select Hohmann transfer to trigger that code path
        const select = document.getElementById('maneuver-type-select') as HTMLSelectElement;
        expect(select).not.toBeNull();
        select.value = 'hohmann';
        select.dispatchEvent(new Event('change'));

        const resultDiv = document.getElementById('planner-results');
        expect(resultDiv).not.toBeNull();

        // The innerHTML should contain the escaped string, not the tag
        // <span ...>Error: &lt;img ...&gt;</span>

        // 1. Verify the image tag was NOT created (XSS prevented)
        expect(resultDiv?.querySelector('img')).toBeNull();

        // 2. Verify the text content shows the error message verbatim
        expect(resultDiv?.textContent).toContain(maliciousPayload);
    });
});
