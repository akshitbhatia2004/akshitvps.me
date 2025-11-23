// Vercel Serverless: create-order.js
// Creates a Cashfree order using server-side env vars.
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { amount, customer } = req.body;
    if (!amount || !customer || !customer.email) return res.status(400).json({ error: 'Missing amount or customer' });

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET = process.env.CASHFREE_SECRET;
    const ENV = process.env.CASHFREE_ENV === 'PROD' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    const body = {
      order_amount: Number(amount).toFixed(2),
      order_currency: 'INR',
      order_note: `Order for ${customer.email}`,
      customer_details: {
        customer_email: customer.email,
        customer_name: customer.name || 'Customer',
        customer_phone: customer.phone || ''
      }
    };

    const r = await fetch(`${ENV}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': APP_ID,
        'x-client-secret': SECRET
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Cashfree error', details: data });
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
}
