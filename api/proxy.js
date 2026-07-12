export default async function handler(req) {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  const method = req.method;

  const origin = req.headers.get('Origin') || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, PROPFIND, MKCOL, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (!target) {
    return new Response('Missing ?url= parameter', { status: 400, headers: cors });
  }

  const targetUrl = new URL(target);
  const forwardHeaders = new Headers();
  const keep = ['authorization', 'content-type', 'depth'];
  for (const h of keep) {
    const val = req.headers.get(h);
    if (val) forwardHeaders.set(h, val);
  }
  forwardHeaders.set('host', targetUrl.host);
  forwardHeaders.set('user-agent', 'WebDAV-Proxy/1.0');
  forwardHeaders.set('accept', '*/*');

  try {
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await req.text();
    }

    const response = await fetch(target, {
      method: method,
      headers: forwardHeaders,
      body: body,
    });

    const respHeaders = new Headers(response.headers);
    respHeaders.set('Access-Control-Allow-Origin', origin);
    respHeaders.set('Access-Control-Expose-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
}

export const config = { runtime: 'edge' };
