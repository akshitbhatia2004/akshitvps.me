import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'orders.json');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { orderId } = JSON.parse(req.body);

  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = 'paid';
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

  res.status(200).json({ ok: true });
}
