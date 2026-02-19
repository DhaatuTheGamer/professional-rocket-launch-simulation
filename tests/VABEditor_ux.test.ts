
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { VABEditor } from '../src/ui/VABEditor';

describe('VABEditor UX Improvements', () => {
    let dom: JSDOM;
    let container: HTMLElement;

    beforeEach(() => {
        // Setup JSDOM
        dom = new JSDOM('<!DOCTYPE html><div id="vab-container"></div>');
        global.document = dom.window.document;
        global.window = dom.window as any;
        global.HTMLElement = dom.window.HTMLElement;
        global.NodeList = dom.window.NodeList;
        // Mock alert
        global.alert = vi.fn();

        container = document.getElementById('vab-container')!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should disable "Add to Stage" buttons when no part is selected', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        // Initial render happens in constructor

        const addButtons = container.querySelectorAll('.vab-add-to-stage');
        expect(addButtons.length).toBeGreaterThan(0);

        addButtons.forEach(btn => {
            expect(btn.hasAttribute('disabled')).toBe(true);
            expect(btn.getAttribute('title')).toBe('Select a part from the catalog first');
        });
    });

    it('should enable "Add to Stage" button when a part is selected', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        // Find a part to select
        const partItem = container.querySelector('.vab-part-item') as HTMLElement;
        expect(partItem).toBeTruthy();

        // Click it
        partItem.click();

        // Check buttons
        const addButtons = container.querySelectorAll('.vab-add-to-stage');
        addButtons.forEach(btn => {
            expect(btn.hasAttribute('disabled')).toBe(false);
            expect(btn.getAttribute('title')).toContain('Add');
        });
    });

    it('should persist selection after adding a part (re-render)', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        // Select a part
        const partItem = container.querySelector('.vab-part-item') as HTMLElement;
        partItem.click();

        // Get the selected part ID to verify persistence
        const partId = partItem.getAttribute('data-part-id');

        // Click add to stage button (first stage)
        const addBtn = container.querySelector('.vab-add-to-stage[data-stage="0"]') as HTMLElement;
        addBtn.click();

        // Re-render should have happened.
        // Verify selection is still active in UI
        const newPartItem = container.querySelector(`.vab-part-item[data-part-id="${partId}"]`) as HTMLElement;
        expect(newPartItem.classList.contains('selected')).toBe(true);

        // Verify add button is still enabled
        const newAddBtn = container.querySelector('.vab-add-to-stage[data-stage="0"]') as HTMLElement;
        expect(newAddBtn.hasAttribute('disabled')).toBe(false);
    });

    it('should preserve scroll position of parts list on re-render', () => {
        const onLaunch = vi.fn();
        const editor = new VABEditor('vab-container', onLaunch);

        const partsList = container.querySelector('#vab-parts-list') as HTMLElement;

        // Mock scrollTop (JSDOM doesn't handle layout/scroll automatically)
        Object.defineProperty(partsList, 'scrollTop', { value: 100, writable: true });

        // Trigger re-render by selecting a part (which calls render in our new implementation)
        const partItem = container.querySelector('.vab-part-item') as HTMLElement;
        partItem.click();

        // Get the new list element
        const newPartsList = container.querySelector('#vab-parts-list') as HTMLElement;
        expect(newPartsList.scrollTop).toBe(100);
    });
});
