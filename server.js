import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8080;
const ROOT_DIR = path.resolve('.');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm'
};

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains'
};

// Rate Limiting Configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 200; // Max requests per window per IP
const requestCounts = new Map();

// Periodic cleanup of expired rate limit entries (every 1 minute)
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requestCounts.entries()) {
        if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
            requestCounts.delete(ip);
        }
    }
}, RATE_LIMIT_WINDOW_MS);

http.createServer((req, res) => {
    const ip = req.socket.remoteAddress;
    const now = Date.now();

    // Rate Limiting Logic
    let requestData = requestCounts.get(ip);

    if (!requestData || (now - requestData.startTime > RATE_LIMIT_WINDOW_MS)) {
        // Reset window if new IP or window expired
        requestData = { count: 0, startTime: now };
        requestCounts.set(ip, requestData);
    }

    requestData.count++;

    if (requestData.count > RATE_LIMIT_MAX_REQUESTS) {
        if (requestData.count === RATE_LIMIT_MAX_REQUESTS + 1) {
            console.warn(`Rate limit exceeded for IP: ${ip}`);
        }
        res.writeHead(429, {
            'Content-Type': 'text/plain',
            'Retry-After': Math.ceil((requestData.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000),
            ...SECURITY_HEADERS
        });
        res.end('Too Many Requests');
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // Security: Prevent Directory Traversal
    try {
        const safeUrl = new URL(req.url, `http://${req.headers.host}`);
        let pathname = decodeURIComponent(safeUrl.pathname);

        if (pathname === '/') {
            pathname = '/index.html';
        }

        const filePath = path.join(ROOT_DIR, pathname);

        // Ensure the resolved path starts with the ROOT_DIR
        // This prevents access to files outside the project root
        if (!filePath.startsWith(ROOT_DIR) ||
            (filePath.length > ROOT_DIR.length && filePath[ROOT_DIR.length] !== path.sep)) {
            res.writeHead(403, {
                'Content-Type': 'text/plain',
                ...SECURITY_HEADERS
            });
            res.end('Forbidden');
            return;
        }

        const extname = path.extname(filePath);
        let contentType = MIME_TYPES[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    const errorPage = path.join(ROOT_DIR, '404.html');
                    fs.readFile(errorPage, (err, content404) => {
                        res.writeHead(404, {
                            'Content-Type': 'text/html',
                            ...SECURITY_HEADERS
                        });
                        res.end(content404 || '404 Not Found', 'utf-8');
                    });
                } else {
                    res.writeHead(500, {
                        ...SECURITY_HEADERS
                    });
                    res.end('Server Error: ' + error.code);
                }
            } else {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'Cross-Origin-Embedder-Policy': 'require-corp',
                    ...SECURITY_HEADERS
                });
                res.end(content, 'utf-8');
            }
        });
    } catch (e) {
        console.error('Request processing error:', e);
        res.writeHead(400, {
            ...SECURITY_HEADERS
        });
        res.end('Bad Request');
    }

}).listen(PORT);

console.log(`Server running at http://localhost:${PORT}/`);
