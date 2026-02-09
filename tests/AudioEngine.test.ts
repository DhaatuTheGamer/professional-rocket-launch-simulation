
import { AudioEngine } from '../src/utils/AudioEngine';
import assert from 'assert';

class MockAudioContext {
    state: string = 'running';
    sampleRate: number = 44100;
    currentTime: number = 0;
    destination: any = {};
    createGain() { return { gain: { value: 0, setTargetAtTime: () => {}, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createBuffer(channels: number, length: number, sampleRate: number) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { return { buffer: null, loop: false, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { type: 'lowpass', frequency: { value: 0, setTargetAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    resume() { return Promise.resolve(); }
}

// Mock window and AudioContext
(global as any).window = {
    AudioContext: MockAudioContext,
    webkitAudioContext: undefined,
    speechSynthesis: {
        getVoices: () => [],
        cancel: () => {},
        speak: () => {}
    }
};
(global as any).AudioContext = MockAudioContext;

// Test function
async function runTest() {
    console.log('Testing AudioEngine initialization...');

    const engine = new AudioEngine();

    // Call init
    engine.init();

    assert.ok(engine.initialized, 'AudioEngine should be initialized');
    // Verify context is created
    assert.strictEqual((engine as any).ctx instanceof MockAudioContext, true, 'Should use AudioContext');

    console.log('PASS: AudioEngine initializes with standard AudioContext');
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
