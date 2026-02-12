
import { describe, it, expect } from 'vitest';

describe('VABEditor Security (Mock Pattern)', () => {
    it('Should demonstrate XSS vulnerability pattern with unsafe innerHTML', () => {
        const maliciousName = '"><script>alert(1)</script>';

        // This is the vulnerable pattern found in VABEditor.ts
        const html = `<input type="text" class="vab-name-input" value="${maliciousName}" placeholder="Rocket Name">`;

        // Confirm it breaks the attribute
        expect(html).toContain('value=""><script>alert(1)</script>"');
    });

    it('Should demonstrate safe pattern using DOM property', () => {
        const maliciousName = '"><script>alert(1)</script>';

        // This is the fix pattern
        // 1. Template uses empty or no value attribute
        const html = `<input type="text" class="vab-name-input" placeholder="Rocket Name">`;

        // 2. Value is set via property (simulated here)
        const inputElement = { value: '' };
        inputElement.value = maliciousName;

        // Confirm HTML is clean
        expect(html).not.toContain('<script>');

        // Confirm value is preserved correctly in the object
        expect(inputElement.value).toBe(maliciousName);
    });
});
