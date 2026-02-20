
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { VABEditor } from '../src/ui/VABEditor';
import { VehicleBlueprint, addStage, addPartToStage, createBlueprint } from '../src/vab/VehicleBlueprint';
import { PARTS_CATALOG } from '../src/vab/PartsCatalog';

describe('VABEditor XSS Vulnerability Regression', () => {
    let dom: any;
    let container: any;

    beforeEach(() => {
        // Setup JSDOM
        dom = new JSDOM('<!DOCTYPE html><div id="vab-container"></div>', {
            url: "http://localhost/",
            runScripts: "dangerously",
            resources: "usable"
        });
        (globalThis as any).document = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;

        // Mock localStorage
        const localStorageMock = (function () {
            let store: Record<string, string> = {};
            return {
                getItem: function (key: string) {
                    return store[key] || null;
                },
                setItem: function (key: string, value: string) {
                    store[key] = value.toString();
                },
                clear: function () {
                    store = {};
                },
                removeItem: function (key: string) {
                    delete store[key];
                }
            };
        })();
        (globalThis as any).localStorage = localStorageMock;

        container = document.getElementById('vab-container')!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should prevent XSS in instanceId', () => {
        // Instantiate VABEditor
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        // Overwrite with a simple blueprint to make testing easier
        let blueprint = createBlueprint('Test Rocket');
        blueprint = addStage(blueprint);

        const engine = PARTS_CATALOG.find(p => p.category === 'engine')!;
        blueprint = addPartToStage(blueprint, 0, engine);

        // Inject malicious payload into instanceId of the part we just added
        const maliciousId = '"><script>alert("XSS")</script>';
        blueprint.stages[0]!.parts[0]!.instanceId = maliciousId;

        // Update the editor's blueprint
        (editor as any).blueprint = blueprint;

        // Force render (private method)
        (editor as any).render();

        // Check HTML content for script tags
        const html = container.innerHTML;

        // The script tag should NOT be present in the HTML (it should be escaped)
        expect(html).not.toContain('<script>alert("XSS")</script>');

        // Check that the script tag didn't sneak in some other way
        const scripts = container.getElementsByTagName('script');
        expect(scripts.length).toBe(0);

        // Find the element and check that the attribute contains the value safely
        const partPreview = container.querySelector('.vab-part-preview');
        expect(partPreview).not.toBeNull();

        // The attribute value should be the malicious string, proving it was correctly encoded/decoded
        expect(partPreview.getAttribute('data-instance')).toBe(maliciousId);
    });
});
