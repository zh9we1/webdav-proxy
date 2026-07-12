/**
 * WebDAV Proxy for Railway (zero dependencies)
 * Binary-safe — handles EPUB (ZIP) files without corruption.
 */
const http = require('http');

const PORT = process.env.PORT || 9000;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PROPFIND, MKCOL, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = url.searchParams.get('url');
  if (!target) {
    res.writeHead(400);
    res.end('Missing ?url= parameter');
    return;
  }

  try {
    const targetUrl = new URL(target);
    const forwardHeaders = {
      'Host': targetUrl.host,
      'User-Agent': 'WebDAV-Proxy/1.0',
      'Accept': '*/*',
    };
    if (req.headers['authorization']) forwardHeaders['Authorization'] = req.headers['authorization'];
    if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type'];
    if (req.headers['depth']) forwardHeaders['Depth'] = req.headers['depth'];

    // Read request body for non-GET requests
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    const response = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body: body || null,
    });

    // Forward response headers
    for (const [k, v] of response.headers) {
      if (!['set-cookie', 'cf-ray', 'cf-cache-status', 'x-served-by', 'transfer-encoding'].includes(k)) {
        res.setHeader(k, v);
      }
    }

    // ✅ Binary-safe: use arrayBuffer() + Buffer, NOT text()
    const arrayBuffer = await response.arrayBuffer();
    res.writeHead(response.status);
    res.end(Buffer.from(arrayBuffer));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('WebDAV Proxy started on port', PORT);
});
