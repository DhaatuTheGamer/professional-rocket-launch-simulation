/**
 * Input Manager
 * 
 * Centralized input handling for keyboard and touch controls.
 * Abstracts input sources to provide unified API for game logic.
 */

import { InputActions, JoystickState, ThrottleTouchState } from '../types';

export class InputManager {
    /** Current key states */
    private keys: Record<string, boolean> = {};

    /** High-level action states */
    public actions: InputActions = {
        THROTTLE_UP: false,
        THROTTLE_DOWN: false,
        YAW_LEFT: false,
        YAW_RIGHT: false,
        MAP_MODE: false,
        TIME_WARP_UP: false,
        TIME_WARP_DOWN: false,
        CUT_ENGINE: false,
        SAS_TOGGLE: false
    };

    /** Joystick state for touch controls */
    private joystick: JoystickState = { active: false, x: 0, y: 0 };

    /** Throttle touch state */
    private throttleTouch: ThrottleTouchState = { active: false, value: 0 };

    /** Camera mode (1=follow, 2=orbit, 3=cinema) */
    public cameraMode: number = 1;

    constructor() {
        this.initListeners();
    }

    /**
     * Initialize event listeners
     */
    private initListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.updateActionsFromKeys();

            // Toggle actions (one-shot)
            if (e.key === 'm' || e.key === 'M') {
                this.actions.MAP_MODE = !this.actions.MAP_MODE;
            }
            if (e.key === 't' || e.key === 'T') {
                this.actions.SAS_TOGGLE = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.updateActionsFromKeys();

            if (e.key === 't' || e.key === 'T') {
                this.actions.SAS_TOGGLE = false;
            }
        });

        // Touch controls
        this.initTouchControls();
    }

    /**
     * Initialize touch control elements
     */
    private initTouchControls(): void {
        const joystickZone = document.getElementById('joystick-zone');
        if (joystickZone) {
            joystickZone.addEventListener('touchstart', (e) => this.handleJoystick(e, true), { passive: false });
            joystickZone.addEventListener('touchmove', (e) => this.handleJoystick(e, true), { passive: false });
            joystickZone.addEventListener('touchend', () => this.handleJoystick(null, false));
        }

        const throttleZone = document.getElementById('throttle-zone');
        if (throttleZone) {
            throttleZone.addEventListener('touchstart', (e) => this.handleThrottle(e), { passive: false });
            throttleZone.addEventListener('touchmove', (e) => this.handleThrottle(e), { passive: false });
            throttleZone.addEventListener('touchend', () => {
                this.throttleTouch.active = false;
            });
        }
    }

    /**
     * Update actions from current key states
     */
    private updateActionsFromKeys(): void {
        this.actions.THROTTLE_UP = this.keys['Shift'] ?? false;
        this.actions.THROTTLE_DOWN = this.keys['Control'] ?? false;
        this.actions.YAW_LEFT = this.keys['ArrowLeft'] ?? false;
        this.actions.YAW_RIGHT = this.keys['ArrowRight'] ?? false;
        this.actions.CUT_ENGINE = (this.keys['x'] ?? false) || (this.keys['X'] ?? false);
        this.actions.TIME_WARP_UP = (this.keys['.'] ?? false) || (this.keys['>'] ?? false);
        this.actions.TIME_WARP_DOWN = (this.keys[','] ?? false) || (this.keys['<'] ?? false);
    }

    /**
     * Handle joystick touch events
     */
    private handleJoystick(e: TouchEvent | null, active: boolean): void {
        if (!active || !e) {
            this.joystick.active = false;
            this.joystick.x = 0;
            this.joystick.y = 0;

            // Reset knob visual
            const knob = document.getElementById('joystick-knob');
            if (knob) {
                knob.style.transform = 'translate(0px, 0px)';
            }
            return;
        }

        e.preventDefault();

        const touch = e.touches[0];
        const zone = document.getElementById('joystick-zone');
        if (!touch || !zone) return;

        const rect = zone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxDist = rect.width / 2;

        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to circle
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        // Normalize to -1 to 1
        this.joystick.active = true;
        this.joystick.x = dx / maxDist;
        this.joystick.y = dy / maxDist;

        // Update knob visual
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    /**
     * Handle throttle touch events
     */
    private handleThrottle(e: TouchEvent): void {
        e.preventDefault();

        const touch = e.touches[0];
        const zone = document.getElementById('throttle-zone');
        if (!touch || !zone) return;

        const rect = zone.getBoundingClientRect();
        const y = touch.clientY - rect.top;

        // Invert (top = 1, bottom = 0)
        this.throttleTouch.active = true;
        this.throttleTouch.value = 1 - Math.max(0, Math.min(1, y / rect.height));

        // Update handle visual
        const handle = document.getElementById('throttle-handle');
        if (handle) {
            handle.style.bottom = `${this.throttleTouch.value * 100}%`;
        }
    }

    /**
     * Get an action state
     */
    getAction(name: keyof InputActions): boolean {
        return this.actions[name];
    }

    /**
     * Get steering value (-1 to 1)
     */
    getSteering(): number {
        if (this.actions.YAW_LEFT) return -1;
        if (this.actions.YAW_RIGHT) return 1;
        if (this.joystick.active) return this.joystick.x;
        return 0;
    }

    /**
     * Get throttle command (-1, 0, or 1)
     */
    getThrottleCommand(): number {
        if (this.actions.THROTTLE_UP) return 1;
        if (this.actions.THROTTLE_DOWN) return -1;
        return 0;
    }

    /**
     * Get touch throttle value (0 to 1)
     */
    getTouchThrottle(): number | null {
        return this.throttleTouch.active ? this.throttleTouch.value : null;
    }

    /**
     * Check if a specific key is pressed
     */
    isKeyPressed(key: string): boolean {
        return this.keys[key] ?? false;
    }
}
