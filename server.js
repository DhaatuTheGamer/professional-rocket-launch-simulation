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

http.createServer((req, res) => {
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
            res.writeHead(403, { 'Content-Type': 'text/plain' });
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
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(content404 || '404 Not Found', 'utf-8');
                    });
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + error.code);
                }
            } else {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'Cross-Origin-Embedder-Policy': 'require-corp'
                });
                res.end(content, 'utf-8');
            }
        });
    } catch (e) {
        console.error('Request processing error:', e);
        res.writeHead(400);
        res.end('Bad Request');
    }

}).listen(PORT);

console.log(`Server running at http://localhost:${PORT}/`);
