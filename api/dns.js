export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  // 1. 检查环境变量
  if (!NEXTDNS_ID) {
    return new Response('Error: NEXTDNS_ID is not set in Vercel env.', { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const dnsParam = searchParams.get('dns');

  // 2. 友好反馈：如果是浏览器直接访问（非 DoH 查询），显示欢迎语
  if (req.method === 'GET' && !dnsParam) {
    return new Response('NextDNS Vercel Proxy: Active ✅', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
    });
  }

  // 3. 转发 DNS 请求
  const targetUrl = `https://dns.nextdns.io/${NEXTDNS_ID}`;
  const body = req.method === 'POST' ? await req.arrayBuffer() : null;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/dns-message',
        'Accept': 'application/dns-message',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || '',
      },
      body: body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/dns-message',
        'Cache-Control': 'max-age=0',
      },
    });
  } catch (err) {
    return new Response(`Fetch Error: ${err.message}`, { status: 502 });
  }
}