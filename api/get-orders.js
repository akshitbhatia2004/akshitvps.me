import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'orders.json');

export default function handler(req, res) {
  try {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    res.status(200).json(orders);
  } catch {
    res.status(200).json([]);
  }
}
