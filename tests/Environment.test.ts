import { describe, it, expect } from 'vitest';
import { EnvironmentSystem, type WindLayer } from '../src/physics/Environment';
import { Vec2 } from '../src/types/index';

describe('EnvironmentSystem', () => {
    describe('Wind Lookup', () => {
        it('should return surface wind correctly', () => {
            const env = new EnvironmentSystem();
            const wind = env.getWindAtAltitude(0);
            const speed = Vec2.magnitude(wind);
            expect(speed).toBeCloseTo(5, 3);
        });

        it('should interpolate between layers', () => {
            const env = new EnvironmentSystem();
            // Layer 0: 5 m/s (0-1000m)
            // Layer 1: 12 m/s (1000m-5000m)
            // At 500m (midpoint 0-1000), expecting average? 
            // Wait, existing test said (5+12)/2 = 8.5.
            const wind = env.getWindAtAltitude(500);
            const speed = Vec2.magnitude(wind);
            expect(speed).toBeCloseTo(8.5, 3);
        });

        it('should match start of next layer', () => {
            const env = new EnvironmentSystem();
            const wind = env.getWindAtAltitude(1000);
            const speed = Vec2.magnitude(wind);
            expect(speed).toBeCloseTo(12, 3);
        });

        it('should clamp negative altitude', () => {
            const env = new EnvironmentSystem();
            const wind = env.getWindAtAltitude(-100);
            expect(Vec2.magnitude(wind)).toBeCloseTo(5, 3);
        });

        it('should handle constant high altitude wind', () => {
            const env = new EnvironmentSystem();
            const wind = env.getWindAtAltitude(60000); // > 50km
            expect(Vec2.magnitude(wind)).toBeCloseTo(2, 3);
        });
    });

    describe('Custom Layers', () => {
        it('should use custom wind layers', () => {
            const env = new EnvironmentSystem();
            const layers: WindLayer[] = [
                { altitudeMin: 0, altitudeMax: 100, windSpeed: 10, windDirection: 0 },
                { altitudeMin: 100, altitudeMax: 200, windSpeed: 20, windDirection: 0 }
            ];
            env.setWindLayers(layers);

            const wind = env.getWindAtAltitude(50); // Midpoint
            expect(Vec2.magnitude(wind)).toBeCloseTo(15, 3);
        });

        it('should handle unsorted layers', () => {
            const env = new EnvironmentSystem();
            const layers: WindLayer[] = [
                { altitudeMin: 100, altitudeMax: 200, windSpeed: 20, windDirection: 0 },
                { altitudeMin: 0, altitudeMax: 100, windSpeed: 10, windDirection: 0 }
            ];
            env.setWindLayers(layers);

            const wind = env.getWindAtAltitude(50);
            expect(Vec2.magnitude(wind)).toBeCloseTo(15, 3);
        });
    });
});
