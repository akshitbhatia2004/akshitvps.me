# SkyNode Cashfree Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase and run [supabase-schema.sql](/C:/vps%20%26%20rdp/supabase-schema.sql).
3. Copy `.env.example` to `.env`.
4. Fill in:
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_ENV`
   - `BASE_URL`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
5. Start the app:
   - `npm start`
6. Open:
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
- Orders and products are now expected to live in Supabase for production/Vercel use.
- Set your real Supabase environment variables in Vercel Project Settings.
- Set your real Resend environment variables in Vercel Project Settings if you want automatic emails.
- Do not commit real Cashfree or Supabase secrets to GitHub.
