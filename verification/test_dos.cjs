const { spawn } = require('child_process');
const http = require('http');

const SERVER_PORT = 8080;
const MAX_TRACKED_IPS = 5000;
const RATE_LIMIT_WINDOW = 200;

function waitForServer(port) {
    return new Promise((resolve) => {
        const check = () => {
            const req = http.get(`http://localhost:${port}/`, (res) => {
                res.destroy();
                resolve();
            });
            req.on('error', () => {
                setTimeout(check, 100);
            });
            req.end();
        };
        check();
    });
}

function sendRequest(ip) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/',
            method: 'GET',
            headers: {
                'X-Forwarded-For': ip
            }
        };

        const req = http.request(options, (res) => {
            res.resume(); // Consume response
            resolve(res.statusCode);
        });

        req.on('error', reject);
        req.end();
    });
}

async function runTest() {
    console.log('Starting server...');
    const server = spawn('node', ['server.js'], {
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: 'inherit'
    });

    try {
        await waitForServer(SERVER_PORT);
        console.log('Server is up.');

        // Step A: Verify Rate Limiting
        console.log(`Sending ${RATE_LIMIT_WINDOW + 1} requests from IP-1 to test limit...`);
        // Send requests in parallel to be faster, but sequential is safer to count correctly
        const promisesA = [];
        for (let i = 0; i < RATE_LIMIT_WINDOW; i++) {
             promisesA.push(sendRequest('1.1.1.1'));
             if (promisesA.length >= 50) {
                 await Promise.all(promisesA);
                 promisesA.length = 0;
             }
        }
        await Promise.all(promisesA);

        const limitRes = await sendRequest('1.1.1.1');
        if (limitRes !== 429) {
            throw new Error(`Expected 429, got ${limitRes}`);
        }
        console.log('Rate limiting verified (got 429).');

        // Step B: Fill the Map
        console.log(`Flooding with ${MAX_TRACKED_IPS + 100} unique IPs to trigger clear...`);

        const floodCount = MAX_TRACKED_IPS + 100;
        const promisesB = [];
        for (let i = 0; i < floodCount; i++) {
            promisesB.push(sendRequest(`10.0.${Math.floor(i / 255)}.${i % 255}`));
            if (promisesB.length >= 100) {
                await Promise.all(promisesB);
                promisesB.length = 0;
            }
        }
        await Promise.all(promisesB);
        console.log('Flood complete.');

        // Step C: Verify Map Cleared
        // IP-1 was rate limited (count > 200).
        // If map cleared, IP-1 should be reset.
        const resetRes = await sendRequest('1.1.1.1');
        if (resetRes !== 200) {
             throw new Error(`Expected 200 after map clear, got ${resetRes}`);
        }
        console.log('Map clear verified (IP-1 got 200).');

        console.log('TEST PASSED');
    } catch (e) {
        console.error('TEST FAILED:', e);
        process.exit(1);
    } finally {
        server.kill();
    }
}

runTest();
