const http = require('http');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const target = url.searchParams.get('url');
  const method = req.method;
  const origin = req.headers['origin'] || '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PROPFIND, MKCOL, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (!target) { res.writeHead(400); res.end('Missing ?url= parameter'); return; }

  try {
    // 用 Promise 方式收集请求体（兼容性更好）
    const body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : null));
    });

    const targetUrl = new URL(target);
    const fwd = { 'Host': targetUrl.host, 'User-Agent': 'WebDAV-Proxy/1.0', 'Accept': '*/*' };
    if (req.headers['authorization']) fwd['Authorization'] = req.headers['authorization'];
    if (req.headers['content-type']) fwd['Content-Type'] = req.headers['content-type'];
    if (req.headers['depth']) fwd['Depth'] = req.headers['depth'];

    const resp = await fetch(target, { method, headers: fwd, body });

    for (const [k, v] of resp.headers) {
      if (!['set-cookie', 'cf-ray'].includes(k)) res.setHeader(k, v);
    }
    res.writeHead(resp.status);
    res.end(await resp.text());
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin });
    res.end(JSON.stringify({ error: err.message }));
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('WebDAV Proxy running on port', port));
