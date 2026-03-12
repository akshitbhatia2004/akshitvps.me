# SkyNode Cashfree Setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_ENV`
   - `BASE_URL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
3. Start the app:
   - `npm start`
4. Open:
   - `http://localhost:3000`

## Cashfree dashboard setup

- Set the website return URL to:
  - `/payment-return.html?order_id={order_id}`
- Set the webhook URL to:
  - `/api/cashfree/webhook`

Example local URLs:

- Return URL:
  - `http://localhost:3000/payment-return.html?order_id={order_id}`
- Webhook URL:
  - `http://localhost:3000/api/cashfree/webhook`

## Important

- Cashfree requires a real reachable webhook URL for production.
- The current project stores data in `data/products.json` and `data/orders.json`.
- For production, move orders, products, and admin auth to a real database.
