import { describe, it, expect } from 'vitest';
import {
    getPartById,
    getPartsByCategory,
    createPartInstance,
    ENGINE_MERLIN_1D,
    TANK_SMALL,
    PARTS_CATALOG
} from '../src/vab/PartsCatalog';

describe('PartsCatalog', () => {
    describe('getPartById', () => {
        it('should return the correct part for a valid ID', () => {
            const part = getPartById('engine-merlin-1d');
            expect(part).toBeDefined();
            expect(part?.id).toBe('engine-merlin-1d');
            expect(part).toEqual(ENGINE_MERLIN_1D);
        });

        it('should return undefined for an invalid ID', () => {
            const part = getPartById('invalid-part-id');
            expect(part).toBeUndefined();
        });

        it('should return undefined for an empty string ID', () => {
            const part = getPartById('');
            expect(part).toBeUndefined();
        });
    });

    describe('getPartsByCategory', () => {
        it('should return all parts in the engine category', () => {
            const engines = getPartsByCategory('engine');
            expect(engines.length).toBeGreaterThan(0);
            engines.forEach(engine => {
                expect(engine.category).toBe('engine');
            });
            expect(engines).toContainEqual(ENGINE_MERLIN_1D);
        });

        it('should return all parts in the tank category', () => {
            const tanks = getPartsByCategory('tank');
            expect(tanks.length).toBeGreaterThan(0);
            tanks.forEach(tank => {
                expect(tank.category).toBe('tank');
            });
            expect(tanks).toContainEqual(TANK_SMALL);
        });

        it('should return an empty array for a category with no parts', () => {
            // Force cast an invalid category to test the filter logic
            const invalidCategoryParts = getPartsByCategory('nonexistent' as any);
            expect(invalidCategoryParts).toEqual([]);
        });

        it('should return parts that exist in the PARTS_CATALOG', () => {
            const engines = getPartsByCategory('engine');
            engines.forEach(engine => {
                expect(PARTS_CATALOG).toContainEqual(engine);
            });
        });
    });

    describe('createPartInstance', () => {
        it('should create a valid part instance with default stage index', () => {
            const instance = createPartInstance(ENGINE_MERLIN_1D);

            expect(instance.part).toEqual(ENGINE_MERLIN_1D);
            expect(instance.stageIndex).toBe(0);
            expect(instance.instanceId).toMatch(/^engine-merlin-1d-\d+$/);
        });

        it('should create a valid part instance with a specific stage index', () => {
            const stageIndex = 2;
            const instance = createPartInstance(TANK_SMALL, stageIndex);

            expect(instance.part).toEqual(TANK_SMALL);
            expect(instance.stageIndex).toBe(stageIndex);
            expect(instance.instanceId).toMatch(/^tank-small-\d+$/);
        });

        it('should generate unique instance IDs for consecutive calls', () => {
            const instance1 = createPartInstance(ENGINE_MERLIN_1D);
            const instance2 = createPartInstance(ENGINE_MERLIN_1D);
            const instance3 = createPartInstance(TANK_SMALL);

            expect(instance1.instanceId).not.toBe(instance2.instanceId);
            expect(instance1.instanceId).not.toBe(instance3.instanceId);
            expect(instance2.instanceId).not.toBe(instance3.instanceId);

            // Validate the format
            expect(instance1.instanceId).toMatch(/^engine-merlin-1d-\d+$/);
            expect(instance2.instanceId).toMatch(/^engine-merlin-1d-\d+$/);
            expect(instance3.instanceId).toMatch(/^tank-small-\d+$/);
        });
    });
});
