const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

// Sert `dir` en émulant cleanUrls de Vercel.
function startServer(dir) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400); res.end('Bad request'); return;
    }
    const base = path.join(root, pathname);
    if (base !== root && !base.startsWith(root + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const trimmed = base.replace(/\/+$/, '');
    const candidates = [base, trimmed + '.html', path.join(trimmed, 'index.html')];
    const file = candidates.find(isFile);
    if (!file) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((r) => { server.close(() => r()); server.closeAllConnections?.(); }),
      });
    });
  });
}

module.exports = { startServer };
