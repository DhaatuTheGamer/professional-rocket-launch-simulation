import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VABEditor } from '../src/ui/VABEditor';
import * as VehicleBlueprint from '../src/vab/VehicleBlueprint';
import { JSDOM } from 'jsdom';

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

describe('Security Vulnerability Reproduction', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!DOCTYPE html><div id="vab-container"></div>');
        global.document = dom.window.document as any;
        global.window = dom.window as any;
        global.HTMLElement = dom.window.HTMLElement as any;
    });

    it('should show that unescaped instanceId can lead to XSS', () => {
        // Instantiate VABEditor
        // This will call the mocked createFalconPreset()
        const editor = new VABEditor('vab-container', () => {});

        const container = document.getElementById('vab-container');
        expect(container).not.toBeNull();

        // We look for the part preview element. Since we use createElement, the browser handles escaping.
        // Even if we put XSS payload in data-instance, it's set via setAttribute, so it's inherently safe.
        // We can check if the element exists and its dataset has the right value.
        const partPreview = container!.querySelector('.vab-part-preview') as HTMLElement;
        expect(partPreview).not.toBeNull();
        expect(partPreview.dataset.instance).toBe('"><img src=x onerror=alert(1)>');

        // Ensure no actual img tag was created by innerHTML injection
        const img = container!.querySelector('img');
        expect(img).toBeNull();
    });
});
