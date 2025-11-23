# AkshitVPS — Cashfree Checkout integrated (v2)

This package adds:
- Cashfree JS SDK in public/index.html
- Frontend `handleBuy` that creates server-side order and opens checkout
- Serverless endpoints: api/create-order and api/webhook
- create-order includes notify_url using SITE_URL or VERCEL_URL env var

How to use:
1. unzip, push to GitHub and import to Vercel or upload directly.
2. Set environment variables in Vercel:
   - CASHFREE_APP_ID
   - CASHFREE_SECRET
   - CASHFREE_ENV = TEST or PROD
   - VITE_ADMIN_PASSWORD (optional)
   - SITE_URL = https://akshitvps.me (or set VERCEL_URL)
3. Deploy. Click Buy on the site to start sandbox checkout.

