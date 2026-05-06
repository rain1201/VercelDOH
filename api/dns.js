export const config = {
  runtime: 'edge', // 强制使用边缘运行时，响应最快
};

export default async function handler(req) {
  // 替换为你自己的 NextDNS ID
  const NEXTDNS_ID = process.env.NEXTDNS_ID;

  if (!NEXTDNS_ID) {
    return new Response('Configuration Error: NEXTDNS_ID is missing.', { status: 500 });
  }

  // 1. 简单的路径/安全校验（防止被当成普通代理）
  const contentType = req.headers.get('content-type');
  if (req.method === 'POST' && contentType !== 'application/dns-message') {
    return new Response('Not Found', { status: 404 });
  }
  const targetUrl = `https://dns.nextdns.io/${NEXTDNS_ID}`;

  // 复制原始请求的 Body (DoH 包含 POST 数据)
  const body = req.method === 'POST' ? await req.arrayBuffer() : null;

  // 转发请求并透传必要的 Header
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': 'application/dns-message',
      'Accept': 'application/dns-message',
      // 将客户端真实 IP 传递给 NextDNS，以便获得精准的解析结果
      'X-Forwarded-For': req.headers.get('x-forwarded-for') || '',
    },
    body: body,
  });

  // 返回 NextDNS 的响应结果
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/dns-message',
      'Cache-Control': 'max-age=0',
    },
  });
}