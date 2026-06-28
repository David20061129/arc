const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const dataPath = path.join(rootDir, 'data', 'operators.json');

function makeImageSvg(name, color) {
  const safeName = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="24" fill="${color}" />
      <circle cx="80" cy="65" r="34" fill="#fff" opacity="0.18" />
      <rect x="44" y="108" width="72" height="18" rx="9" fill="#fff" opacity="0.2" />
      <text x="80" y="92" font-size="18" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif">${safeName}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadOperators() {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const list = JSON.parse(raw);
  return list.map((operator, index) => ({
    ...operator,
    image: operator.image || makeImageSvg(operator.name, ['#4f7cff', '#f05e7b', '#45b88a', '#ffb347', '#7b61ff'][index % 5])
  }));
}

const operators = loadOperators();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/operators') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(operators));
    return;
  }

  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  let filePath = pathname === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, pathname);
  if (!path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`服务已启动：http://localhost:${port}`);
});
