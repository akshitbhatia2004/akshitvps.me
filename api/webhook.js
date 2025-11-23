// Vercel Serverless: webhook.js
// Simple webhook endpoint to receive Cashfree payment notifications.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok'); // Cashfree will post JSON payloads

  // TODO: Verify webhook signature here (Cashfree sends headers you must verify)
  // Update order status in your DB or trigger provisioning.

  res.status(200).json({ received: true });
}
