import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScriptEditor } from '../src/ui/ScriptEditor';
import { FlightComputer } from '../src/guidance/FlightComputer';

// Mock DOM
class MockHTMLElement {
    id: string = '';
    className: string = '';
    tagName: string = '';
    innerHTML: string = '';
    textContent: string = '';
    value: string = '';
    style: any = { display: '' };
    attributes: Record<string, string> = {};
    children: MockHTMLElement[] = [];
    classList = {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
    };
    options: any[] = []; // for select

    constructor(tagName: string = 'div') {
        this.tagName = tagName.toUpperCase();
    }

    getAttribute(name: string) {
        return this.attributes[name] || null;
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }

    addEventListener() { }
    removeEventListener() { }
    focus() { }
    appendChild(child: MockHTMLElement) {
        this.children.push(child);
        return child;
    }

    // Minimal querySelector/remove/etc
    remove(index?: number) { }
    querySelector(selector: string) { return null; }
}

const mockDocument = {
    body: new MockHTMLElement('BODY'),
    getElementById: (id: string) => {
        const findIn = (el: MockHTMLElement): MockHTMLElement | null => {
            if (el.id === id) return el;
            for (const child of el.children) {
                const found = findIn(child);
                if (found) return found;
            }
            return null;
        };
        return findIn(mockDocument.body);
    },
    createElement: (tagName: string) => new MockHTMLElement(tagName),
    addEventListener: () => { },
};

const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

(globalThis as any).document = mockDocument;
(globalThis as any).window = {};
(globalThis as any).localStorage = mockLocalStorage;

describe('ScriptEditor Accessibility', () => {
    let editor: ScriptEditor;
    let flightComputer: FlightComputer;

    beforeEach(() => {
        // Reset DOM
        mockDocument.body = new MockHTMLElement('BODY');

        // Mock FlightComputer
        flightComputer = {
            state: { script: null },
            loadScript: vi.fn(),
        } as any;
    });

    it('should have aria-label on interactive elements', () => {
        // Mock Game object
        const mockGame: any = {
            flightComputer: flightComputer,
            command: vi.fn(),
            on: vi.fn(),
            addPhysicsEventListener: vi.fn()
        };

        // Instantiate editor
        editor = new ScriptEditor(mockGame);

        // Get the modal (it's appended to body)
        const modal = mockDocument.body.children[0];
        expect(modal).toBeDefined();

        // Helper to find element by ID in mock DOM
        const getById = (id: string): any => {
            const find = (el: any): any => {
                if (el.id === id) return el;
                for (const child of el.children) {
                    const found = find(child);
                    if (found) return found;
                }
                return null;
            };
            return find(modal);
        };

        // Assertions for Accessibility Attributes

        // 1. Close Button
        const closeBtn = getById('script-editor-close');
        expect(closeBtn).toBeDefined();
        expect(closeBtn.getAttribute('aria-label')).toBe('Close script editor');
        expect(closeBtn.getAttribute('title')).toBe('Close');

        // 2. Preset Select
        const presetSelect = getById('script-preset-select');
        expect(presetSelect).toBeDefined();
        expect(presetSelect.getAttribute('aria-label')).toBe('Load preset script');

        // 3. Save Select
        const saveSelect = getById('script-save-select');
        expect(saveSelect).toBeDefined();
        expect(saveSelect.getAttribute('aria-label')).toBe('Load saved script');

        // 4. Textarea
        const textarea = getById('script-textarea');
        expect(textarea).toBeDefined();
        expect(textarea.getAttribute('aria-label')).toBe('Script editor content');

        // 5. Name Input
        const nameInput = getById('script-name-input');
        expect(nameInput).toBeDefined();
        expect(nameInput.getAttribute('aria-label')).toBe('Script name');
    });
});
