
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VABEditor } from '../src/ui/VABEditor';
import * as VehicleBlueprint from '../src/vab/VehicleBlueprint';

// Mock the module
vi.mock('../src/vab/VehicleBlueprint', async () => {
    const actual = await vi.importActual('../src/vab/VehicleBlueprint');
    return {
        ...actual,
        createFalconPreset: () => ({
            name: 'Hacked Rocket',
            id: 'hacked-1',
            createdAt: 123,
            modifiedAt: 123,
            stages: [{
                stageNumber: 0,
                hasDecoupler: false,
                parts: [{
                    part: {
                        id: 'engine-merlin-1d',
                        name: 'Merlin 1D',
                        category: 'engine',
                        mass: 470,
                        height: 25,
                        width: 30,
                        cost: 1000,
                        description: 'High-thrust kerolox engine',
                    },
                    instanceId: '"><img src=x onerror=alert(1)>', // XSS Payload
                    stageIndex: 0
                }]
            }]
        }),
        loadBlueprints: () => []
    };
});

// Mock DOM
const mockElement = {
    innerHTML: '',
    value: '',
    style: { display: '' },
    querySelector: () => mockElement,
    querySelectorAll: () => [mockElement],
    addEventListener: () => {},
    dataset: {},
    classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
    }
};

global.document = {
    getElementById: () => mockElement,
    createElement: () => mockElement,
    body: { appendChild: () => {} },
} as any;

global.alert = () => {};

describe('Security Vulnerability Reproduction', () => {
    it('should show that unescaped instanceId can lead to XSS', () => {
        // Instantiate VABEditor
        // This will call the mocked createFalconPreset()
        const editor = new VABEditor('vab-container', () => {});

        // Check mocked innerHTML
        const html = mockElement.innerHTML;

        // Assert that the XSS payload is NOT present in its dangerous form
        expect(html).not.toContain('data-instance=""><img src=x onerror=alert(1)>"');

        // Assert that the payload IS present in its escaped, safe form
        // "><img... becomes &quot;&gt;&lt;img...
        const expectedSafe = '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;';
        expect(html).toContain(`data-instance="${expectedSafe}"`);
    });
});
