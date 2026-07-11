export default async function handler(req) {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, PROPFIND, MKCOL, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (!target) {
    return new Response('Missing ?url= parameter', { status: 400 });
  }

  const response = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? null : req.body,
  });

  const respHeaders = new Headers(response.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');
  respHeaders.set('Access-Control-Expose-Headers', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

export const config = {
  runtime: 'edge',
};
