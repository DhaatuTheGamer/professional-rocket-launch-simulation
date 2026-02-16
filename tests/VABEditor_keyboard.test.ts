
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
        global.KeyboardEvent = dom.window.KeyboardEvent;
        global.Event = dom.window.Event;

        container = document.getElementById('vab-container')!;

        // Mock alert
        global.alert = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have accessible category tabs', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        // Force render to ensure elements are present
        (editor as any).render();

        const tabsContainer = container.querySelector('.vab-category-tabs');
        expect(tabsContainer).toBeTruthy();
        expect(tabsContainer?.getAttribute('role')).toBe('tablist');
        expect(tabsContainer?.getAttribute('aria-label')).toBe('Part Categories');

        const tabs = container.querySelectorAll('.vab-cat-tab');
        expect(tabs.length).toBeGreaterThan(0);

        tabs.forEach(tab => {
            expect(tab.getAttribute('role')).toBe('tab');
            // One should be selected, others not
            expect(tab.hasAttribute('aria-selected')).toBe(true);
        });

        // Check active tab
        const activeTab = container.querySelector('.vab-cat-tab.active');
        expect(activeTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('should have accessible part items', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const parts = container.querySelectorAll('.vab-part-item');
        expect(parts.length).toBeGreaterThan(0);

        parts.forEach(part => {
            expect(part.getAttribute('tabindex')).toBe('0');
            expect(part.getAttribute('role')).toBe('button');
            expect(part.hasAttribute('aria-label')).toBe(true);
        });
    });

    it('should select part on Enter key press', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const parts = container.querySelectorAll('.vab-part-item');
        expect(parts.length).toBeGreaterThan(0);

        const firstPart = parts[0] as HTMLElement;

        // Initial state: not selected
        expect(firstPart.classList.contains('selected')).toBe(false);

        // Simulate Enter keydown
        const event = new dom.window.KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true
        });

        firstPart.dispatchEvent(event);

        // Should be selected now
        expect(firstPart.classList.contains('selected')).toBe(true);
    });

    it('should select part on Space key press', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);
        (editor as any).render();

        const parts = container.querySelectorAll('.vab-part-item');
        expect(parts.length).toBeGreaterThan(0);

        const firstPart = parts[0] as HTMLElement;

        // Simulate Space keydown
        const event = new dom.window.KeyboardEvent('keydown', {
            key: ' ',
            bubbles: true,
            cancelable: true
        });

        // Spy on preventDefault
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        firstPart.dispatchEvent(event);

        // Should be selected
        expect(firstPart.classList.contains('selected')).toBe(true);
        // Should prevent scrolling
        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});
