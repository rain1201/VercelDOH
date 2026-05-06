export const config = {
  runtime: 'nodejs',
};

export default async function handler(req) {
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  if (!NEXTDNS_ID) {
    return new Response('NEXTDNS_ID not set', { status: 500 });
  }

  const url = new URL(req.url);
  const dnsParam = url.searchParams.get('dns');

  // 👉 浏览器访问测试
  if (req.method === 'GET' && !dnsParam) {
    return new Response('NextDNS DoH Proxy OK', {
      headers: { 'content-type': 'text/plain' }
    });
  }

  const targetUrl = dnsParam
    ? `https://dns.nextdns.io/${NEXTDNS_ID}?dns=${dnsParam}`
    : `https://dns.nextdns.io/${NEXTDNS_ID}`;

  let body = null;

  if (req.method === 'POST') {
    body = await req.arrayBuffer();
  }

  // 👉 防止 fetch 卡死
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers.get('content-type') || 'application/dns-message',
        'accept': req.headers.get('accept') || 'application/dns-message',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 👉 关键：避免 stream 卡死
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: upstream.status,
      headers: {
        'content-type': 'application/dns-message',
        'cache-control':
          upstream.headers.get('cache-control') || 'public, max-age=60',
      },
    });

  } catch (err) {
    clearTimeout(timeout);

    return new Response(`Fetch error: ${err.message}`, {
      status: 502,
    });
  }
}