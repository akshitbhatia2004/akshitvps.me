import { createOrder } from "../lib/orderStore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, customer = {}, telegram, whatsapp, metadata } = req.body;

    /* ---------- STRICT VALIDATION ---------- */

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    if (!customer.email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!telegram) {
      return res.status(400).json({ error: "Telegram number is required" });
    }

    if (!whatsapp) {
      return res.status(400).json({ error: "WhatsApp number is required" });
    }

    /* ---------- SANITIZATION ---------- */

    const safeCustomerId =
      customer.email.replace(/[^a-zA-Z0-9]/g, "") || "guest001";

    const customerEmail = customer.email;

    const customerPhone =
      customer.phone && String(customer.phone).length === 10
        ? String(customer.phone)
        : String(whatsapp); // fallback

    /* ---------- CASHFREE CONFIG ---------- */

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET = process.env.CASHFREE_SECRET;

    const ENV =
      (process.env.CASHFREE_ENV || "TEST").toUpperCase() === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    /* ---------- ORDER BODY ---------- */

    const body = {
      order_amount: Number(amount).toFixed(2),
      order_currency: "INR",
      order_note: "Akshit VPS order",
      customer_details: {
        customer_id: safeCustomerId,
        customer_name: customer.name || "user-089",
        customer_email: customerEmail,
        customer_phone: customerPhone
      },
      order_meta: {
        telegram_number: telegram,
        whatsapp_number: whatsapp,
        ...(metadata || {})
      }
    };

    /* ---------- WEBHOOK ---------- */

    const HOST =
      process.env.SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null);

    if (HOST) {
      body.notify_url = `${HOST.replace(/\/$/, "")}/api/webhook`;
    }

    /* ---------- API CALL ---------- */

    const response = await fetch(`${ENV}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": APP_ID,
        "x-client-secret": SECRET
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "Cashfree error",
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("create-order error", err);
    return res.status(500).json({
      error: "server_error",
      message: err.message
    });
  }
}
