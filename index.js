/**
 * WebDAV Proxy for Railway
 * Binary-safe — handles EPUB (ZIP) files without corruption.
 */
import express from 'express';

const app = express();
app.use(express.raw({ type: '*/*', limit: '200mb' }));

app.all('*', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PROPFIND, MKCOL, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  const target = req.query.url;
  if (!target) {
    return res.status(400).send('Missing ?url= parameter');
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

    const body = (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : null;

    const response = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body: body,
    });

    // Forward response headers (skip problematic ones)
    for (const [k, v] of response.headers) {
      if (!['set-cookie', 'cf-ray', 'cf-cache-status', 'x-served-by', 'transfer-encoding'].includes(k)) {
        res.setHeader(k, v);
      }
    }

    // ✅ Binary-safe: use arrayBuffer() + Buffer, NOT text()
    const arrayBuffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

const port = process.env.PORT || 9000;
app.listen(port, '0.0.0.0');
console.log('WebDAV Proxy started on port', port);
