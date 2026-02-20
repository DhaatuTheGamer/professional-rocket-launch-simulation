
import { describe, it, expect } from 'vitest';
import { Deque } from '../src/utils/Deque';

describe('Deque', () => {
    it('should initialize empty', () => {
        const deque = new Deque<number>(10);
        expect(deque.size()).toBe(0);
        expect(deque.isEmpty()).toBe(true);
    });

    it('should push and pop correctly', () => {
        const deque = new Deque<number>(10);
        deque.push(1);
        deque.push(2);
        expect(deque.size()).toBe(2);
        expect(deque.pop()).toBe(2);
        expect(deque.pop()).toBe(1);
        expect(deque.isEmpty()).toBe(true);
    });

    it('should shift and unshift correctly', () => {
        const deque = new Deque<number>(10);
        deque.unshift(1);
        deque.unshift(2);
        expect(deque.size()).toBe(2);
        expect(deque.shift()).toBe(2);
        expect(deque.shift()).toBe(1);
        expect(deque.isEmpty()).toBe(true);
    });

    it('should handle wrap around', () => {
        const deque = new Deque<number>(4);
        deque.push(1);
        deque.push(2);
        deque.push(3);
        deque.shift(); // Remove 1. Head moves.
        deque.push(4);
        deque.push(5); // Tail wraps.

        expect(deque.size()).toBe(4);
        expect(deque.get(0)).toBe(2);
        expect(deque.get(1)).toBe(3);
        expect(deque.get(2)).toBe(4);
        expect(deque.get(3)).toBe(5);
    });

    it('should resize when full', () => {
        const deque = new Deque<number>(2);
        deque.push(1);
        deque.push(2);
        deque.push(3); // Should resize

        expect(deque.size()).toBe(3);
        expect(deque.get(0)).toBe(1);
        expect(deque.get(1)).toBe(2);
        expect(deque.get(2)).toBe(3);
    });

    it('should peek correctly', () => {
        const deque = new Deque<number>(10);
        deque.push(1);
        deque.push(2);
        expect(deque.peekFront()).toBe(1);
        expect(deque.peekBack()).toBe(2);
    });
});
