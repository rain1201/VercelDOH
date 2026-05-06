export const config = {
  runtime: 'nodejs',
};

export default async function handler(req) {
  return new Response(JSON.stringify({
    status: "ok",
    message: "Vercel function is working",
    method: req.method,
    url: req.url,
    time: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}