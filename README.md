# AkshitVPS — Vite React (Cashfree ready)

This is a ready-to-deploy project for AkshitVPS with:
- Frontend (Vite + React): plans, checkout modal, admin panel
- Serverless endpoints for Vercel: /api/create-order and /api/webhook
- Demo admin (client-side) password: admin123 (use VITE_ADMIN_PASSWORD env var in Vercel)

## How to deploy
1. Add repository to GitHub or unzip locally and `git init && git add . && git commit -m "init"`.
2. Import repo into Vercel.
3. Add environment variables in Vercel:
   - CASHFREE_APP_ID
   - CASHFREE_SECRET
   - CASHFREE_ENV = TEST or PROD
   - VITE_ADMIN_PASSWORD (optional)
4. Build settings: Framework = Vite, Build Command = `npm run build`, Output Directory = `dist`.
5. Test with sandbox Cashfree credentials.

## Notes
- This project uses serverless endpoints to keep Cashfree SECRET off the client.
- Implement real DB + secure admin auth before production.
