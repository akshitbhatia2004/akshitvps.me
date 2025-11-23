import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, customer, metadata } = req.body;
    if (!amount || !customer?.email) return res.status(400).json({ error: 'Missing amount or customer.email' });

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET = process.env.CASHFREE_SECRET;
    const ENV = (process.env.CASHFREE_ENV || 'TEST').toUpperCase() === 'PROD'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    const body = {
      order_amount: Number(amount).toFixed(2),
      order_currency: 'INR',
      order_note: `AkshitVPS order for ${customer.email}`,
      customer_details: {
        customer_id: customer.id || customer.email,
        customer_phone: customer.phone || '',
        customer_name: customer.name || 'Customer',
        customer_email: customer.email
      },
      ...metadata ? { order_meta: metadata } : {}
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
    // return full cashfree response to frontend
    return res.status(200).json(data);
  } catch (err) {
    console.error('create-order error', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
}
