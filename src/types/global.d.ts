import { IVessel } from './index';
import { Navball } from '../ui/Navball';
import { MissionLog } from '../ui/MissionLog';
import { AudioEngine } from '../utils/AudioEngine';

declare global {
    interface Window {
        PIXELS_PER_METER: number;
        R_EARTH: number;
        navball: Navball;
        missionLog: MissionLog;
        audio: AudioEngine;
        mainStack: IVessel | null;
        trackedEntity: IVessel | null;
    }
}
