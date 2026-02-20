import { describe, it, expect } from 'vitest';
import { getEntityOffset, EntityOffset, HEADER_SIZE, ENTITY_STRIDE } from '../src/core/PhysicsBuffer';

describe('PhysicsBuffer', () => {
    describe('getEntityOffset', () => {
        it('should calculate correct offset for the first entity (index 0)', () => {
            // First entity starts right after the header
            // Formula: HEADER_SIZE + index * ENTITY_STRIDE + property

            expect(getEntityOffset(0, EntityOffset.TYPE)).toBe(HEADER_SIZE + EntityOffset.TYPE);
            expect(getEntityOffset(0, EntityOffset.X)).toBe(HEADER_SIZE + EntityOffset.X);
            expect(getEntityOffset(0, EntityOffset.ID)).toBe(HEADER_SIZE + EntityOffset.ID);
        });

        it('should calculate correct offset for the second entity (index 1)', () => {
            // Second entity starts at HEADER_SIZE + ENTITY_STRIDE
            const base = HEADER_SIZE + ENTITY_STRIDE;

            expect(getEntityOffset(1, EntityOffset.TYPE)).toBe(base + EntityOffset.TYPE);
            expect(getEntityOffset(1, EntityOffset.X)).toBe(base + EntityOffset.X);
            expect(getEntityOffset(1, EntityOffset.ID)).toBe(base + EntityOffset.ID);
        });

        it('should calculate correct offset for an arbitrary entity (index 10)', () => {
            // 11th entity (index 10)
            const index = 10;
            const base = HEADER_SIZE + index * ENTITY_STRIDE;

            expect(getEntityOffset(index, EntityOffset.TYPE)).toBe(base + EntityOffset.TYPE);
            expect(getEntityOffset(index, EntityOffset.X)).toBe(base + EntityOffset.X);
            expect(getEntityOffset(index, EntityOffset.ID)).toBe(base + EntityOffset.ID);
        });

        it('should handle large indices correctly', () => {
            const index = 999;
            const base = HEADER_SIZE + index * ENTITY_STRIDE;
            expect(getEntityOffset(index, EntityOffset.TYPE)).toBe(base + EntityOffset.TYPE);
        });
    });
});
