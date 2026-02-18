
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { VABEditor } from '../src/ui/VABEditor';

// Mock PartCatalog since VABEditor imports it
vi.mock('../src/vab/PartsCatalog', async () => {
    const actual = await vi.importActual('../src/vab/PartsCatalog');
    return {
        ...actual,
        getPartsByCategory: vi.fn().mockReturnValue([
            { id: 'engine1', name: 'Engine 1', category: 'engine', mass: 1000, cost: 1000, description: 'Test Engine' }
        ])
    };
});

// Mock VehicleBlueprint stuff
vi.mock('../src/vab/VehicleBlueprint', async () => {
    const actual = await vi.importActual('../src/vab/VehicleBlueprint');
    return {
        ...actual,
        createFalconPreset: vi.fn().mockReturnValue({
            id: 'test-bp',
            name: 'Test Rocket',
            stages: []
        }),
        calculateStats: vi.fn().mockReturnValue({
            wetMass: 1000,
            dryMass: 100,
            totalDeltaV: 5000,
            totalCost: 1000,
            stageTWR: [1.5],
            hasAvionics: true,
            hasFairing: true
        }),
        loadBlueprints: vi.fn().mockReturnValue([])
    };
});

describe('VABEditor Tabs Accessibility', () => {
    let dom: any;
    let container: HTMLElement;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><div id="vab-container"></div>');
        global.document = dom.window.document;
        global.window = dom.window;
        global.HTMLElement = dom.window.HTMLElement;
        container = document.getElementById('vab-container')!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should implement ARIA tab pattern', () => {
        const onLaunch = vi.fn();
        // Instantiate editor which triggers render
        new VABEditor('vab-container', onLaunch);

        const tablist = container.querySelector('[role="tablist"]');
        expect(tablist, 'Tablist not found').toBeTruthy();

        const tabs = container.querySelectorAll('[role="tab"]');
        expect(tabs.length).toBeGreaterThan(0);

        const activeTab = container.querySelector('[aria-selected="true"]');
        expect(activeTab, 'Active tab not found').toBeTruthy();
        expect(activeTab?.classList.contains('active')).toBe(true);

        const tabpanel = container.querySelector('[role="tabpanel"]');
        expect(tabpanel, 'Tabpanel not found').toBeTruthy();
        expect(tabpanel?.id).toBe('vab-parts-list');

        // Check relationships
        const activeTabId = activeTab?.id;
        expect(tabpanel?.getAttribute('aria-labelledby')).toBe(activeTabId);
        expect(activeTab?.getAttribute('aria-controls')).toBe('vab-parts-list');
    });

    it('should display icons in tabs', () => {
        const onLaunch = vi.fn();
        new VABEditor('vab-container', onLaunch);

        const tabs = container.querySelectorAll('.vab-cat-tab');
        // Check if at least one known icon is present
        const textContent = Array.from(tabs).map(t => t.textContent).join('');
        expect(textContent).toMatch(/🔥|⛽|🎛️|🛡️|⚡|🚀/);
    });
});
