
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { VABEditor } from '../src/ui/VABEditor';

describe('VABEditor Accessibility', () => {
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

    it('should have accessible labels on remove buttons', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        // Force render
        (editor as any).render();

        // There should be remove buttons if there are parts
        // Default blueprint has parts? VABEditor initializes with createFalconPreset()

        const removePartButtons = container.querySelectorAll('.remove-part');
        expect(removePartButtons.length).toBeGreaterThan(0);

        removePartButtons.forEach(btn => {
            expect(btn.hasAttribute('aria-label')).toBe(true);
            expect(btn.getAttribute('title')).toBeTruthy();
        });

        const removeStageButtons = container.querySelectorAll('.remove-stage');
        // Falcon preset has multiple stages
        if (removeStageButtons.length > 0) {
            removeStageButtons.forEach(btn => {
                expect(btn.hasAttribute('aria-label')).toBe(true);
                expect(btn.getAttribute('title')).toBeTruthy();
            });
        }
    });

    it('should display part icons in the catalog', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const partIcons = container.querySelectorAll('.vab-part-icon');
        expect(partIcons.length).toBeGreaterThan(0);

        // Check if icons are not empty
        partIcons.forEach(icon => {
            expect(icon.textContent?.trim()).not.toBe('');
        });
    });

    it('should have keyboard accessible part list', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const partsList = container.querySelector('.vab-parts-list');
        expect(partsList).toBeTruthy();
        expect(partsList?.getAttribute('role')).toBe('listbox');

        const partItems = container.querySelectorAll('.vab-part-item');
        expect(partItems.length).toBeGreaterThan(0);

        const firstPart = partItems[0] as HTMLElement;
        expect(firstPart.getAttribute('role')).toBe('option');
        expect(firstPart.getAttribute('tabindex')).toBe('0');
        expect(firstPart.getAttribute('aria-selected')).toBe('false');

        // Simulate Keydown Enter
        const enterEvent = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        firstPart.dispatchEvent(enterEvent);

        expect(firstPart.classList.contains('selected')).toBe(true);
        expect(firstPart.getAttribute('aria-selected')).toBe('true');

        // Simulate Keydown Space to select another part
        if (partItems.length > 1) {
            const secondPart = partItems[1] as HTMLElement;
            const spaceEvent = new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true });
            secondPart.dispatchEvent(spaceEvent);

            expect(secondPart.classList.contains('selected')).toBe(true);
            expect(secondPart.getAttribute('aria-selected')).toBe('true');

            expect(firstPart.classList.contains('selected')).toBe(false);
            expect(firstPart.getAttribute('aria-selected')).toBe('false');
        }
    });
});
