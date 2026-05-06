export const config = {
  runtime: 'edge', // 边缘函数
};

export default async function handler(req: Request) {
  const url = new URL(req.url);

  // 1. 忽略无用请求
  if (url.pathname === '/favicon.ico') {
    return new Response(null, { status: 404 });
  }

  // 获取环境变量
  const nextdnsId = process.env.NEXTDNS_ID; // 单一绑定 ID
  const allowedIdsStr = process.env.ALLOWED_IDS; // 允许多个 ID，逗号分隔

  let targetPath = url.pathname;

  // --- 权限控制逻辑 ---

  // 模式 A: 绑定了单一 ID
  if (nextdnsId) {
    // 客户端只需请求 https://dns.yourdomain.com
    // 代理会自动拼装 /<nextdnsId>
    const subPath = url.pathname === '/' ? '' : url.pathname;
    targetPath = `/${nextdnsId}${subPath}`;
  } 
  // 模式 B: 白名单允许多个 ID
  else if (allowedIdsStr) {
    const allowedIds = allowedIdsStr.split(',').map((id: string) => id.trim());
    // 从请求路径中获取第一个参数作为 ID（例如 /abcdef -> abcdef）
    const pathParts = url.pathname.split('/').filter(Boolean);
    const requestProfileId = pathParts[0];

    if (!requestProfileId || !allowedIds.includes(requestProfileId)) {
      return new Response('Forbidden: Access Denied. Your NextDNS ID is not allowed.', { status: 403 });
    }
  } 
  // 模式 C: 没有任何环境变量，提示未配置
  else {
    return new Response('Configuration Missing: Please set NEXTDNS_ID or ALLOWED_IDS in Vercel.', { status: 500 });
  }

  // --- 转发逻辑 ---
  const targetUrl = `https://dns.nextdns.io${targetPath}${url.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host'); // 必须删除

  // 传递客户端真实 IP
  const clientIP = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method === 'POST' ? req.body : undefined,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    return new Response('Proxy Error', { status: 500 });
  }
}