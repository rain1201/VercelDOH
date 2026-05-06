export const config = {
  runtime: 'nodejs',
};

export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    message: "Vercel function is working",
    method: req.method,
    url: req.url,
    headers: req.headers,
    time: new Date().toISOString()
  });
}