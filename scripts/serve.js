/* ==========================================================================
   Tiny static server for THE RAJMAHAL PALACE — with HTTP Range support.
   Range requests make <video> seeking + scroll-scrubbing smooth.
   Usage:  node scripts\serve.js [port]     (default: 8000, serves project root)
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400); res.end('Bad request'); return;
  }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) { /* traversal guard */
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const size = stat.size;
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      if (isNaN(start) || start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + size });
        res.end(); return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': end - start + 1
      });
      fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('The Rajmahal Palace  ->  http://localhost:' + PORT + '   (Ctrl+C to stop)');
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE' && PORT < 8100) {
    const next = PORT + 1;
    console.log('Port ' + PORT + ' is busy — trying ' + next + ' …');
    server.listen(next, '127.0.0.1', () => {
      console.log('The Rajmahal Palace  ->  http://localhost:' + next + '   (Ctrl+C to stop)');
    });
  } else {
    console.error('Server error:', err && err.message);
    process.exit(1);
  }
});

