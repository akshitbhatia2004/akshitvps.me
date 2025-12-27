import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for raw body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const rawBody = await getRawBody(req);

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  if (!signature || !timestamp) {
    return res.status(400).json({ error: "Missing signature or timestamp" });
  }

  const SECRET = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!SECRET) {
    console.error("Missing CASHFREE_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // 🔐 CASHFREE SIGNATURE VERIFICATION
  const signedPayload = timestamp + rawBody;

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(signedPayload)
    .digest("base64");

  if (expectedSignature !== signature) {
    console.warn("Invalid webhook signature", {
      expectedSignature,
      signature,
    });
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.log("✅ Cashfree webhook verified:", payload);

  // ✅ PAYMENT SUCCESS EVENT
  if (payload.type === "PAYMENT_SUCCESS") {
    const orderId = payload.data.order.order_id;
    const paymentId = payload.data.payment.payment_id;

    console.log("💰 Payment successful:", { orderId, paymentId });

    // TODO:
    // 1. markOrderPaid(orderId)
    // 2. provision VPS
    // 3. send WhatsApp / Telegram message
  }

  return res.status(200).json({ received: true });
}

async function getRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", err => reject(err));
  });
}
