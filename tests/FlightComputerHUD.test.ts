import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateFlightComputerHUD } from '../src/ui/FlightComputerHUD';
import { FlightComputer } from '../src/guidance/FlightComputer';

// Mock FlightComputer
const createMockFlightComputer = () => ({
    state: { mode: 'OFF' },
    isActive: vi.fn().mockReturnValue(false),
    getStatusString: vi.fn().mockReturnValue('FC: OFF'),
    getActiveCommandText: vi.fn().mockReturnValue('')
});

describe('FlightComputerHUD Security', () => {
    let container: any;
    let modeDiv: any;
    let commandDiv: any;
    let flightComputer: any;

    beforeEach(() => {
        // Mock DOM elements
        modeDiv = {
            className: '',
            textContent: ''
        };
        commandDiv = {
            className: '',
            textContent: '',
            remove: vi.fn()
        };

        container = {
            classList: {
                add: vi.fn(),
                remove: vi.fn()
            },
            querySelector: vi.fn((selector) => {
                if (selector === '.fc-mode') return modeDiv; // Simulate existing element
                if (selector === '.fc-command') return commandDiv; // Simulate existing element
                return null;
            }),
            appendChild: vi.fn(),
            textContent: ''
        };

        // Mock document.createElement
        global.document = {
            createElement: vi.fn((tag) => {
                if (tag === 'div') return { className: '', textContent: '' };
                return {};
            })
        } as any;

        flightComputer = createMockFlightComputer();
    });

    it('Should securely render malicious command text using textContent', () => {
        // Arrange: Prepare a malicious payload
        const maliciousPayload = '<img src=x onerror=alert(1)>';

        flightComputer.isActive.mockReturnValue(true);
        flightComputer.state.mode = 'RUNNING';
        flightComputer.getStatusString.mockReturnValue('FC: ACTIVE');
        flightComputer.getActiveCommandText.mockReturnValue(maliciousPayload);

        // Act
        updateFlightComputerHUD(container, flightComputer as unknown as FlightComputer);

        // Assert
        // Verify that the command text was set via textContent
        expect(commandDiv.textContent).toBe(maliciousPayload);

        // Verify that innerHTML was NOT set (property should be undefined on our mock)
        expect(commandDiv.innerHTML).toBeUndefined();

        // If innerHTML was used, the mock object would likely have the property set if we didn't restrict it,
        // but since we are mocking the object literal, accessing a non-existent property returns undefined.
        // The key is that the code under test (updateFlightComputerHUD) uses .textContent = ...
    });

    it('Should correctly handle status text', () => {
        flightComputer.isActive.mockReturnValue(true);
        flightComputer.state.mode = 'RUNNING';
        flightComputer.getStatusString.mockReturnValue('FC: TEST');

        updateFlightComputerHUD(container, flightComputer as unknown as FlightComputer);

        expect(modeDiv.textContent).toBe('FC: TEST');
    });
});
