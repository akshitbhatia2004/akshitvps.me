// api/webhook.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // Cashfree sends POSTs; return early for other methods
  if (req.method !== 'POST') return res.status(405).end();

  // Vercel / Node doesn't expose raw body by default in some cases.
  // For webhook signature verify, you must access the raw body (the binary string).
  // On Vercel, you can use the body as received from req (if not parsed).
  const rawBody = await getRawBody(req); // helper below

  const signature = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'];
  const timestamp = req.headers['x-webhook-timestamp'] || req.headers['X-Webhook-Timestamp'];

  if (!signature || !timestamp) {
    console.warn('Missing webhook signature/timestamp');
    return res.status(400).json({ error: 'Missing signature or timestamp' });
  }

  // Your Cashfree secret (same as used to create orders)
  const SECRET = process.env.CASHFREE_SECRET || '';

  // Cashfree's verification: sign = HMAC_SHA256(secret, timestamp + '|' + rawBody)
  const payloadToSign = `${timestamp}|${rawBody}`;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payloadToSign);
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== signature) {
    console.warn('Webhook signature mismatch', { expectedSignature, signature });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Signature ok — parse JSON (safe now)
  let json;
  try { json = JSON.parse(rawBody); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }

  // Example: handle payment.success or order.paid events
  // Update your order database, provision VPS, send email, etc.
  console.log('Cashfree webhook payload:', json);

  // Always respond 200 OK quickly
  res.status(200).json({ received: true });
}

// Helper to read raw request body
async function getRawBody(req) {
  // If body is already a string (rare), return it
  if (typeof req.body === 'string') return req.body;

  // If Vercel already parsed body as JSON, reconstruct string:
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  // Otherwise, collect chunks
  return await new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}
