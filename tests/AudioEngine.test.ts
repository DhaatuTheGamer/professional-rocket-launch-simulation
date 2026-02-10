import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../src/utils/AudioEngine';

// Mock Web Audio API
class MockAudioContext {
    state = 'running';
    sampleRate = 44100;
    currentTime = 0;
    destination = {};
    createGain = vi.fn(() => ({
        gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
    }));
    createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(10) }));
    createBufferSource = vi.fn(() => ({
        buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn()
    }));
    createBiquadFilter = vi.fn(() => ({
        type: 'lowpass', frequency: { value: 0, setTargetAtTime: vi.fn() }, connect: vi.fn()
    }));
    createOscillator = vi.fn(() => ({
        type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(), start: vi.fn(), stop: vi.fn()
    }));
    resume = vi.fn().mockResolvedValue(undefined);
}

// Global mocks
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('window', {
    AudioContext: MockAudioContext,
    speechSynthesis: {
        getVoices: vi.fn(() => []),
        cancel: vi.fn(),
        speak: vi.fn()
    }
});

describe('AudioEngine', () => {
    it('should initialize successfully', () => {
        const engine = new AudioEngine();
        engine.init();
        expect(engine.initialized).toBe(true);
        expect((engine as any).ctx).toBeInstanceOf(MockAudioContext);
    });
});
