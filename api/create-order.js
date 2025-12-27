export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, customer = {}, metadata } = req.body;

    if (!amount || !customer.email) {
      return res.status(400).json({ error: "Missing amount or customer.email" });
    }

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET = process.env.CASHFREE_SECRET;

    const ENV =
      (process.env.CASHFREE_ENV || "TEST").toUpperCase() === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    /* ---------- SAFE CUSTOMER DATA ---------- */

    // customer_id must be alphanumeric
    const safeCustomerId =
      customer.email.replace(/[^a-zA-Z0-9]/g, "") || "guest001";

    const customerEmail = customer.email.includes("@")
      ? customer.email
      : `${safeCustomerId}@gmail.com`;

    const customerPhone =
      customer.phone && String(customer.phone).length === 10
        ? String(customer.phone)
        : "9999999999";

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
      ...(metadata ? { order_meta: metadata } : {})
    };

    /* ---------- WEBHOOK URL ---------- */

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
