import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'];
  const timestamp = req.headers['x-webhook-timestamp'] || req.headers['X-Webhook-Timestamp'];

  if (!signature || !timestamp) return res.status(400).json({ error: 'Missing signature or timestamp' });

  const SECRET = process.env.CASHFREE_SECRET || '';
  const payloadToSign = `${timestamp}|${rawBody}`;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payloadToSign);
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== signature) {
    console.warn('Webhook signature mismatch', { expectedSignature, signature });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let json;
  try { json = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }

  console.log('Cashfree webhook payload:', json);
  // Here you should update your order DB and provision VPS/RDP as needed.

  res.status(200).json({ received: true });
}

async function getRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return await new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}
