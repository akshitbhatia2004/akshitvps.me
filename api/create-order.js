export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, customer, metadata } = req.body;

    if (!amount || !customer?.email) {
      return res.status(400).json({ error: "Missing amount or customer.email" });
    }

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET = process.env.CASHFREE_SECRET;
    const ENV =
      (process.env.CASHFREE_ENV || "TEST").toUpperCase() === "PROD"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    // customer_id must be alphanumeric
    const safeCustomerId = (customer.email || "").replace(/[^a-zA-Z0-9]/g, "");
    const customerEmail = customer.email.includes(@) ? customer.email : '${safeCustmerId}@gmail.com';
    const customer.phone = customer.phone && customer.phone.length == 10 ? customer.phone : "9999999999";

    const body = {
      order_amount: Number(amount).toFixed(2),
      order_currency: "INR",
      order_note: `Akshit VPS order`,
      customer_details: {
        customer_id: safeCustomerId ||,
        customer_name: customer.name ||"user-089",
        customer_email: customer.email,
        customer_phone: customer.phone ||
      },
      ...(metadata ? { order_meta: metadata } : {})
    };

    // add notify_url so webhooks are delivered
    const HOST = process.env.SITE_URL || process.env.VERCEL_URL ? (process.env.SITE_URL || `https://${process.env.VERCEL_URL}`) : null;
    if (HOST) {
      body.notify_url = `${HOST.replace(/\/$/,'')}/api/webhook`;
    }

    const r = await fetch(`${ENV}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": APP_ID,
        "x-client-secret": SECRET
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: "Cashfree error", details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("create-order error", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}
