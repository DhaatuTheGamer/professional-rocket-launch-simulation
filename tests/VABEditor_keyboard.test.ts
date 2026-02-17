
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { VABEditor } from '../src/ui/VABEditor';

describe('VABEditor Keyboard Accessibility', () => {
    let dom: any;
    let container: HTMLElement;

    beforeEach(() => {
        // Setup JSDOM
        dom = new JSDOM('<!DOCTYPE html><div id="vab-container"></div>');
        global.document = dom.window.document;
        global.window = dom.window;
        global.HTMLElement = dom.window.HTMLElement;

        container = document.getElementById('vab-container')!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should allow selecting parts via keyboard (Enter)', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        // Force render
        (editor as any).render();

        // Get the first part item
        const partItem = container.querySelector('.vab-part-item');
        expect(partItem).toBeTruthy();

        // Should have tabindex and role (these will fail initially)
        expect(partItem?.getAttribute('tabindex')).toBe('0');
        expect(partItem?.getAttribute('role')).toBe('button');

        // Simulate Enter key press
        const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        partItem?.dispatchEvent(event);

        // Should have selected class
        expect(partItem?.classList.contains('selected')).toBe(true);
    });

    it('should allow selecting parts via keyboard (Space)', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const partItem = container.querySelector('.vab-part-item');
        expect(partItem).toBeTruthy();

        // Simulate Space key press
        const event = new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true });
        partItem?.dispatchEvent(event);

        // Should have selected class
        expect(partItem?.classList.contains('selected')).toBe(true);
    });
});
