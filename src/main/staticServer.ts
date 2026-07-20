import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

/**
 * Next.js's `output: 'export'` emits root-absolute asset paths
 * (`/_next/static/...`), which resolve to the filesystem root under
 * `win.loadFile()`'s `file://` protocol instead of relative to `out/` —
 * confirmed via CDP network capture (`net::ERR_FILE_NOT_FOUND` for every
 * script/css). Serving `out/` over a local-only HTTP server instead of
 * `file://` sidesteps that entirely, since root-absolute paths resolve
 * correctly against an HTTP origin.
 */
export function startStaticServer(rootDir: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let filePath = normalize(join(rootDir, decodeURIComponent(url.pathname)));

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(rootDir, 'index.html');
    }

    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Static server failed to bind to a port'));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}
