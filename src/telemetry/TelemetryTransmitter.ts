/**
 * Telemetry Transmitter
 * 
 * Broadcasts simulation state to other tabs/windows via BroadcastChannel API.
 * Decouples the simulation loop from the remote visualization view.
 */

import { Vector2D } from '../types/index';

export interface TelemetryPacket {
    timestamp: number;
    missionTime: number;
    altitude: number;
    velocity: number;
    fuel: number;
    throttle: number;
    position: Vector2D;
    velocityVector: Vector2D;
    stage: number;
    liftoff: boolean;
    apogee: number;
    status: string;
}

export class TelemetryTransmitter {
    private channel: BroadcastChannel;
    private lastBroadcast: number = 0;
    private readonly BROADCAST_RATE_MS = 100; // 10Hz update rate

    constructor() {
        this.channel = new BroadcastChannel('telemetry_channel');
    }

    /**
     * Broadcast telemetry packet if enough time has passed
     */
    public broadcast(packet: TelemetryPacket): void {
        const now = performance.now();
        if (now - this.lastBroadcast >= this.BROADCAST_RATE_MS) {
            this.channel.postMessage({
                type: 'TELEMETRY_UPDATE',
                payload: packet
            });
            this.lastBroadcast = now;
        }
    }

    public close(): void {
        this.channel.close();
    }
}
