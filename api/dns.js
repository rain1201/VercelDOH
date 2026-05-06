export const config = {
  runtime: 'nodejs',
};

export default async function handler(req) {
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  if (!NEXTDNS_ID) {
    return new Response('NEXTDNS_ID not set', { status: 500 });
  }

  const url = new URL(req.url, 'http://localhost');
  const dnsParam = url.searchParams.get('dns');

  if (req.method === 'GET' && !dnsParam) {
    return new Response('NextDNS DoH Proxy OK');
  }

  const targetUrl = dnsParam
    ? `https://dns.nextdns.io/${NEXTDNS_ID}?dns=${dnsParam}`
    : `https://dns.nextdns.io/${NEXTDNS_ID}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/dns-message',
        'accept': req.headers['accept'] || 'application/dns-message',
      },
      // ✅ 关键：直接透传 req（不要 arrayBuffer）
      body: req.method === 'POST' ? req : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: upstream.status,
      headers: {
        'content-type': 'application/dns-message',
      },
    });

  } catch (err) {
    clearTimeout(timeout);
    return new Response(`Fetch error: ${err.message}`, { status: 502 });
  }
}