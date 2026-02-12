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

        const html = modal!.innerHTML;

        // Assertions for Accessibility Attributes

        // 1. Close Button
        expect(html).toContain('id="script-editor-close"');
        expect(html).toContain('aria-label="Close script editor"');
        expect(html).toContain('title="Close"');

        // 2. Preset Select
        expect(html).toContain('id="script-preset-select"');
        expect(html).toContain('aria-label="Load preset script"');

        // 3. Save Select
        expect(html).toContain('id="script-save-select"');
        expect(html).toContain('aria-label="Load saved script"');

        // 4. Textarea
        expect(html).toContain('id="script-textarea"');
        expect(html).toContain('aria-label="Script editor content"');

        // 5. Name Input
        expect(html).toContain('id="script-name-input"');
        expect(html).toContain('aria-label="Script name"');
    });
});
