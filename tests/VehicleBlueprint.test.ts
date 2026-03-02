import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createBlueprint,
    addStage,
    addPartToStage,
    removePartFromStage,
    removeStage,
    calculateStats,
    createFalconPreset,
    createSimplePreset,
    serializeBlueprint,
    deserializeBlueprint,
    saveBlueprints,
    loadBlueprints,
    VehicleBlueprint
} from '../src/vab/VehicleBlueprint';
import { ENGINE_MERLIN_1D, TANK_MEDIUM } from '../src/vab/PartsCatalog';

describe('VehicleBlueprint', () => {
    describe('saveBlueprints and loadBlueprints', () => {
        beforeEach(() => {
            // Mock localStorage
            const localStorageMock = (() => {
                let store: Record<string, string> = {};
                return {
                    getItem: vi.fn((key: string) => store[key] || null),
                    setItem: vi.fn((key: string, value: string) => {
                        store[key] = value.toString();
                    }),
                    removeItem: vi.fn((key: string) => {
                        delete store[key];
                    }),
                    clear: vi.fn(() => {
                        store = {};
                    })
                };
            })();
            vi.stubGlobal('localStorage', localStorageMock);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('should save and load blueprints successfully', () => {
            const blueprint1 = createSimplePreset();
            const blueprint2 = createFalconPreset();
            const blueprintsToSave = [blueprint1, blueprint2];

            saveBlueprints(blueprintsToSave);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'vab-blueprints',
                expect.any(String)
            );

            const loadedBlueprints = loadBlueprints();
            expect(localStorage.getItem).toHaveBeenCalledWith('vab-blueprints');
            expect(loadedBlueprints).toHaveLength(2);
            expect(loadedBlueprints[0].name).toBe(blueprint1.name);
            expect(loadedBlueprints[1].name).toBe(blueprint2.name);
        });

        it('should return empty array when no blueprints are saved', () => {
            const loadedBlueprints = loadBlueprints();
            expect(loadedBlueprints).toEqual([]);
        });

        it('should handle invalid JSON in localStorage gracefully', () => {
            localStorage.setItem('vab-blueprints', 'invalid-json');

            // Console error will be logged, let's mock it to keep test output clean
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const loadedBlueprints = loadBlueprints();
            expect(loadedBlueprints).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to load blueprints:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('calculateStats', () => {
        it('should calculate stats for a simple preset', () => {
            const blueprint = createSimplePreset();
            const stats = calculateStats(blueprint);

            // One stage rocket with engine, tank, avionics
            expect(stats.stageDeltaV.length).toBe(1);
            expect(stats.stageTWR.length).toBe(1);
            expect(stats.dryMass).toBeGreaterThan(0);
            expect(stats.fuelMass).toBeGreaterThan(0);
            expect(stats.wetMass).toBe(stats.dryMass + stats.fuelMass);
            expect(stats.totalHeight).toBeGreaterThan(0);
            expect(stats.totalCost).toBeGreaterThan(0);
            expect(stats.hasAvionics).toBe(true);
            expect(stats.hasFairing).toBe(false);
            expect(stats.totalDeltaV).toBe(stats.stageDeltaV[0]);
        });

        it('should calculate stats for a Falcon preset', () => {
            const blueprint = createFalconPreset();
            const stats = calculateStats(blueprint);

            expect(stats.stageDeltaV.length).toBe(2);
            expect(stats.stageTWR.length).toBe(2);
            expect(stats.hasAvionics).toBe(true);
            expect(stats.hasFairing).toBe(true);
            expect(stats.totalDeltaV).toBe(stats.stageDeltaV[0] + stats.stageDeltaV[1]);
        });

        it('should add decoupler mass and height to dryMass and totalHeight for stages with decouplers', () => {
            const blueprint = createBlueprint('Test');

            // Adding first stage (no decoupler)
            const bp1 = addStage(blueprint);
            const stats1 = calculateStats(bp1);

            // Adding second stage (has decoupler)
            const bp2 = addStage(bp1);
            const stats2 = calculateStats(bp2);

            expect(stats1.dryMass).toBe(0);
            expect(stats1.totalHeight).toBe(0);
            expect(stats1.totalCost).toBe(0);

            expect(stats2.dryMass).toBe(50);
            expect(stats2.totalHeight).toBe(5);
            expect(stats2.totalCost).toBe(100);
        });
    });

    describe('Blueprint Actions', () => {
        it('should create an empty blueprint', () => {
            const bp = createBlueprint('My Rocket');
            expect(bp.name).toBe('My Rocket');
            expect(bp.stages).toEqual([]);
            expect(bp.id).toContain('blueprint-');
        });

        it('should add a stage', () => {
            let bp = createBlueprint('My Rocket');
            bp = addStage(bp);
            expect(bp.stages.length).toBe(1);
            expect(bp.stages[0].stageNumber).toBe(0);
            expect(bp.stages[0].hasDecoupler).toBe(false);
            expect(bp.stages[0].parts).toEqual([]);

            bp = addStage(bp);
            expect(bp.stages.length).toBe(2);
            expect(bp.stages[1].stageNumber).toBe(1);
            expect(bp.stages[1].hasDecoupler).toBe(true);
        });

        it('should add a part to a stage', () => {
            let bp = createBlueprint('My Rocket');
            bp = addStage(bp);
            bp = addPartToStage(bp, 0, ENGINE_MERLIN_1D);

            expect(bp.stages[0].parts.length).toBe(1);
            expect(bp.stages[0].parts[0].part.id).toBe(ENGINE_MERLIN_1D.id);
            expect(bp.stages[0].parts[0].stageIndex).toBe(0);
            expect(bp.stages[0].parts[0].instanceId).toBeDefined();

            // Try adding to an invalid stage index
            const originalBp = bp;
            bp = addPartToStage(bp, 99, ENGINE_MERLIN_1D);
            expect(bp).toEqual(originalBp);
        });

        it('should remove a part from a stage', () => {
            let bp = createBlueprint('My Rocket');
            bp = addStage(bp);
            bp = addPartToStage(bp, 0, ENGINE_MERLIN_1D);

            const instanceId = bp.stages[0].parts[0].instanceId;
            bp = removePartFromStage(bp, 0, instanceId);

            expect(bp.stages[0].parts.length).toBe(0);

            // Try removing from invalid stage
            const originalBp = bp;
            bp = removePartFromStage(bp, 99, instanceId);
            expect(bp).toEqual(originalBp);
        });

        it('should remove a stage', () => {
            let bp = createBlueprint('My Rocket');
            bp = addStage(bp);
            bp = addStage(bp);

            bp = removeStage(bp, 0);

            expect(bp.stages.length).toBe(1);
            expect(bp.stages[0].stageNumber).toBe(0); // Renumbered

            // Try removing invalid stage
            const originalBp = bp;
            bp = removeStage(bp, -1);
            bp = removeStage(bp, 99);
            expect(bp).toEqual(originalBp);
        });
    });

    describe('Serialization', () => {
        it('should serialize and deserialize a blueprint', () => {
            const original = createFalconPreset();
            const serialized = serializeBlueprint(original);

            expect(typeof serialized).toBe('string');
            expect(serialized).not.toContain('mass'); // should only store part IDs, not full parts

            const deserialized = deserializeBlueprint(serialized);

            expect(deserialized).not.toBeNull();
            expect(deserialized!.name).toBe(original.name);
            expect(deserialized!.id).toBe(original.id);
            expect(deserialized!.stages.length).toBe(original.stages.length);

            // Verify parts are reconstructed
            expect(deserialized!.stages[0].parts[0].part.id).toBe(original.stages[0].parts[0].part.id);
            expect(deserialized!.stages[0].parts[0].part.mass).toBe(original.stages[0].parts[0].part.mass);
        });

        it('should handle invalid JSON in deserializeBlueprint', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const deserialized = deserializeBlueprint('invalid-json');
            expect(deserialized).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to deserialize blueprint:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should throw and return null if part ID is unknown', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const original = createFalconPreset();
            const serialized = serializeBlueprint(original);

            // Tamper with serialized JSON
            const tampered = serialized.replace(ENGINE_MERLIN_1D.id, 'UNKNOWN_PART_ID');

            const deserialized = deserializeBlueprint(tampered);
            expect(deserialized).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to deserialize blueprint:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });
});
