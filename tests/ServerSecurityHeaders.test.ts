
import http from 'http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

describe('Server Security Headers', () => {
    let serverProcess;
    const PORT = 8080;

    beforeAll(async () => {
        return new Promise((resolve, reject) => {
            serverProcess = spawn('node', ['server.js'], {
                stdio: 'ignore', // Ignore stdout/stderr
                detached: false
            });

            // Give it a moment to start
            setTimeout(resolve, 1000);
        });
    });

    afterAll(() => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    it('should return security headers on 200 OK', async () => {
        const response = await fetch(`http://localhost:${PORT}/index.html`);
        expect(response.status).toBe(200);

        const headers = response.headers;
        console.log('CSP:', headers.get('content-security-policy'));

        expect(headers.get('content-security-policy')).not.toBeNull();
        expect(headers.get('content-security-policy')).toContain("default-src 'self'");
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('x-frame-options')).toBe('DENY');
    });

    it('should return security headers on 404 Not Found', async () => {
        const response = await fetch(`http://localhost:${PORT}/does-not-exist.html`);
        expect(response.status).toBe(404);

        const headers = response.headers;
        expect(headers.get('content-security-policy')).not.toBeNull();
    });
});
