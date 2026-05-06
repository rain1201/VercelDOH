export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  if (!NEXTDNS_ID) {
    res.status(500).send('NEXTDNS_ID not set');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const dnsParam = url.searchParams.get('dns');

  // 👉 浏览器访问测试
  if (req.method === 'GET' && !dnsParam) {
    res.status(200).send('NextDNS Proxy OK');
    return;
  }

  const targetUrl = dnsParam
    ? `https://dns.nextdns.io/${NEXTDNS_ID}?dns=${dnsParam}`
    : `https://dns.nextdns.io/${NEXTDNS_ID}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/dns-message',
        'accept': req.headers['accept'] || 'application/dns-message',
      },
      body: req.method === 'POST' ? req : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 👉 关键：不要用 stream，直接读完
    const buffer = await upstream.arrayBuffer();

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/dns-message');
    res.setHeader(
      'Cache-Control',
      upstream.headers.get('cache-control') || 'public, max-age=60'
    );

    res.send(Buffer.from(buffer));

  } catch (err) {
    res.status(502).send(`Fetch error: ${err.message}`);
  }
}