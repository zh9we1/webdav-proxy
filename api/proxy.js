export default async function handler(req) {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  const method = req.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, PROPFIND, MKCOL, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (!target) {
    return new Response('Missing ?url= parameter', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    // 读取请求体文本
    let bodyText = null;
    if (method !== 'GET' && method !== 'HEAD') {
      bodyText = await req.text();
    }

    // 只转发必要的请求头
    const forwardHeaders = new Headers();
    if (req.headers.has('authorization')) {
      forwardHeaders.set('authorization', req.headers.get('authorization'));
    }
    if (req.headers.has('content-type')) {
      forwardHeaders.set('content-type', req.headers.get('content-type'));
    }
    if (req.headers.has('depth')) {
      forwardHeaders.set('depth', req.headers.get('depth'));
    }
    forwardHeaders.set('user-agent', 'WebDAV-Proxy/1.0');
    forwardHeaders.set('accept', '*/*');

    // 发送请求
    const response = await fetch(target, {
      method: method,
      headers: forwardHeaders,
      body: bodyText,
    });

    // 构建响应
    const respHeaders = new Headers(response.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Expose-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export const config = {
  runtime: 'edge',
};
