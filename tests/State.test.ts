import { describe, it, expect, beforeEach } from 'vitest';
import { state, store } from '../src/core/State';

describe('Global State', () => {
    beforeEach(() => {
        store.dispatch({ type: 'RESET' });
        store.dispatch({ type: 'SET_TIME_SCALE', scale: 1.0 });
        store.dispatch({ type: 'SET_PAUSED', paused: false });
    });

    it('should synchronize timeScale from store', () => {
        // Initial state check
        expect(state.timeScale).toBe(1.0);

        // Dispatch action
        store.dispatch({ type: 'SET_TIME_SCALE', scale: 2.0 });

        // Verify state update
        expect(state.timeScale).toBe(2.0);
    });

    it('should synchronize paused from store', () => {
        // Initial state check
        expect(state.paused).toBe(false);

        // Dispatch action
        store.dispatch({ type: 'SET_PAUSED', paused: true });

        // Verify state update
        expect(state.paused).toBe(true);
    });
});
