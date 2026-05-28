const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      response.end('404 Not Found');
      return;
    }

    response.writeHead(200, { 'Content-Type': getContentType(filePath) });
    response.end(content);
  });
}

function handleRequest(request, response, defaultPage, port) {
  const requestUrl = decodeURI(request.url.split('?')[0]);
  let normalizedPath = path.normalize(requestUrl).replace(/^\.+/, '');
  if (normalizedPath === '/' || normalizedPath === '') {
    normalizedPath = `/${defaultPage}`;
  }

  if (port === 3000 && (requestUrl === '/admin' || requestUrl === '/admin/')) {
    response.writeHead(302, { Location: 'http://localhost:3001/' });
    response.end();
    return;
  }

  const filePath = path.join(ROOT, normalizedPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, response);
    return;
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
  response.end('404 Not Found');
}

http.createServer((req, res) => handleRequest(req, res, 'index.html', 3000)).listen(3000, () => {
  console.log('Main dashboard available at http://localhost:3000');
});

http.createServer((req, res) => handleRequest(req, res, 'admin.html', 3001)).listen(3001, () => {
  console.log('Admin dashboard available at http://localhost:3001');
});
