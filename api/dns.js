export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  if (!NEXTDNS_ID) {
    return new Response('NEXTDNS_ID not set', { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const dnsParam = searchParams.get('dns');

  if (req.method === 'GET' && !dnsParam) {
    return new Response('NextDNS Proxy OK', {
      headers: { 'content-type': 'text/plain' }
    });
  }

  const targetUrl = dnsParam
    ? `https://dns.nextdns.io/${NEXTDNS_ID}?dns=${dnsParam}`
    : `https://dns.nextdns.io/${NEXTDNS_ID}`;

  const body = req.method === 'POST' ? await req.arrayBuffer() : null;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers.get('content-type') || 'application/dns-message',
        'accept': req.headers.get('accept') || 'application/dns-message',
      },
      body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type': 'application/dns-message',
        'cache-control': response.headers.get('cache-control') || 'public, max-age=60',
      },
    });

  } catch (err) {
    return new Response(`Fetch error: ${err.message}`, { status: 502 });
  }
}