const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CASHFREE_ENV = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2025-01-01";
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-random-secret";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";

const DEFAULT_PRODUCTS = [
  {
    id: "prd-india-2c-2g",
    type: "VPS",
    name: "India IP VPS 2GB",
    ram: "2 GB",
    cpu: "2 Core",
    storage: "50 GB SSD",
    price: 400,
    description: "Affordable India IP VPS plan for light hosting, trading tools, and small workloads."
  },
  {
    id: "prd-india-2c-4g",
    type: "VPS",
    name: "India IP VPS 4GB",
    ram: "4 GB",
    cpu: "2 Core",
    storage: "50 GB SSD",
    price: 500,
    description: "Balanced India IP VPS with more memory for websites, apps, and daily remote work."
  },
  {
    id: "prd-india-4c-8g",
    type: "VPS",
    name: "India IP VPS 8GB",
    ram: "8 GB",
    cpu: "4 Core",
    storage: "50 GB SSD",
    price: 700,
    description: "Fast India IP VPS for growing projects, heavier apps, and multitasking."
  },
  {
    id: "prd-india-4c-12g",
    type: "VPS",
    name: "India IP VPS 12GB",
    ram: "12 GB",
    cpu: "4 Core",
    storage: "80 GB SSD",
    price: 850,
    description: "Higher-memory India IP VPS for stronger performance and smoother business workloads."
  },
  {
    id: "prd-india-4c-16g",
    type: "VPS",
    name: "India IP VPS 16GB",
    ram: "16 GB",
    cpu: "4 Core",
    storage: "80 GB SSD",
    price: 1200,
    description: "Premium India IP VPS plan for large projects, automation, and power users."
  }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const CASHFREE_API_BASE =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
const IS_SECURE_BASE_URL = BASE_URL.startsWith("https://");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseJsonBody(buffer) {
  if (!buffer.length) {
    return {};
  }
  return JSON.parse(buffer.toString("utf8"));
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

function nowStamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function generateOrderId() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `SKY-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${random}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createAdminToken() {
  const payload = {
    username: ADMIN_USERNAME,
    issuedAt: Date.now()
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [encodedPayload, signature] = token.split(".");
  if (signValue(encodedPayload) !== signature) {
    return null;
  }
  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }
}

function sessionCookie(value, maxAge = null) {
  const parts = [
    `skynode_admin_session=${value}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax"
  ];
  if (IS_SECURE_BASE_URL) {
    parts.push("Secure");
  }
  if (maxAge !== null) {
    parts.push(`Max-Age=${maxAge}`);
  }
  return parts.join("; ");
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  return verifyAdminToken(cookies.skynode_admin_session);
}

function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

function mapProductRow(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    ram: row.ram,
    cpu: row.cpu,
    storage: row.storage,
    price: Number(row.price),
    description: row.description
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    telegramId: row.telegram_id || "",
    note: row.note || "",
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    createdAt: row.created_at_label || row.created_at,
    deliveryMethod: row.delivery_method || "",
    credentials: row.credentials || null,
    cashfreeOrderId: row.cashfree_order_id || "",
    cashfreeOrderStatus: row.cashfree_order_status || "ACTIVE",
    paymentSessionId: row.payment_session_id || "",
    orderReceivedEmailSent: Boolean(row.order_received_email_sent),
    paymentSuccessEmailSent: Boolean(row.payment_success_email_sent),
    deliveryEmailSent: Boolean(row.delivery_email_sent)
  };
}

function mapProductToRow(product) {
  return {
    id: product.id,
    type: product.type,
    name: product.name,
    ram: product.ram,
    cpu: product.cpu,
    storage: product.storage,
    price: Number(product.price),
    description: product.description
  };
}

function mapOrderToRow(order) {
  return {
    id: order.id,
    product_id: order.productId,
    product_name: order.productName,
    customer_name: order.customerName,
    email: order.email,
    phone: order.phone,
    telegram_id: order.telegramId || "",
    note: order.note || "",
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    created_at: order.createdAt,
    created_at_label: order.createdAt,
    delivery_method: order.deliveryMethod || "",
    credentials: order.credentials || null,
    cashfree_order_id: order.cashfreeOrderId || "",
    cashfree_order_status: order.cashfreeOrderStatus || "ACTIVE",
    payment_session_id: order.paymentSessionId || "",
    order_received_email_sent: Boolean(order.orderReceivedEmailSent),
    payment_success_email_sent: Boolean(order.paymentSuccessEmailSent),
    delivery_email_sent: Boolean(order.deliveryEmailSent)
  };
}

function canSendEmails() {
  return Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);
}

async function sendEmail({ to, subject, html }) {
  if (!canSendEmails()) {
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html
    })
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || data.error || "Email sending failed.");
  }
  return data;
}

function orderReceivedEmailHtml(order) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:12px;color:#111827;">Order Confirmation</h2>
      <p>Thank you for your order with SkyNode.</p>
      <p>We have received your request and created your order successfully.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:12px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin:0 0 8px;"><strong>Product:</strong> ${order.productName}</p>
        <p style="margin:0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
      </div>
      <p>You can use your order ID to track the order status on our website at any time.</p>
      <p>If you have any questions, you can reply to this email.</p>
      <p style="margin-top:24px;">Regards,<br>SkyNode Support</p>
    </div>
  `;
}

function paymentSuccessEmailHtml(order) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:12px;color:#111827;">Payment Received</h2>
      <p>We have received your payment successfully.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:12px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin:0 0 8px;"><strong>Product:</strong> ${order.productName}</p>
        <p style="margin:0;"><strong>Order Status:</strong> ${order.orderStatus}</p>
      </div>
      <p>Your VPS setup is now in progress. Login details will be sent within 24 hours.</p>
      <p style="margin-top:24px;">Regards,<br>SkyNode Support</p>
    </div>
  `;
}

function deliveryEmailHtml(order) {
  const credentials = order.credentials || {};
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:12px;color:#111827;">Your VPS Is Ready</h2>
      <p>Your service has been prepared successfully. Please find your access details below.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:12px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin:0 0 8px;"><strong>Product:</strong> ${order.productName}</p>
        <p style="margin:0 0 8px;"><strong>Username:</strong> ${credentials.username || ""}</p>
        <p style="margin:0 0 8px;"><strong>Password:</strong> ${credentials.password || ""}</p>
        <p style="margin:0 0 8px;"><strong>IP Address:</strong> ${credentials.ipAddress || ""}</p>
        <p style="margin:0;"><strong>Delivery Method:</strong> ${order.deliveryMethod || "Email"}</p>
      </div>
      <p>Please keep these details secure. If you need assistance, reply to this email.</p>
      <p style="margin-top:24px;">Regards,<br>SkyNode Support</p>
    </div>
  `;
}

async function sendOrderReceivedEmail(order) {
  if (order.orderReceivedEmailSent) {
    return order;
  }
  await sendEmail({
    to: order.email,
    subject: `Order Received - ${order.id}`,
    html: orderReceivedEmailHtml(order)
  });
  return updateOrder(order.id, { orderReceivedEmailSent: true });
}

async function sendPaymentSuccessEmail(order) {
  if (order.paymentSuccessEmailSent || order.paymentStatus !== "Successful") {
    return order;
  }
  await sendEmail({
    to: order.email,
    subject: `Payment Successful - ${order.id}`,
    html: paymentSuccessEmailHtml(order)
  });
  return updateOrder(order.id, { paymentSuccessEmailSent: true });
}

async function sendDeliveryEmail(order) {
  if (order.deliveryEmailSent || order.orderStatus !== "Delivered") {
    return order;
  }
  await sendEmail({
    to: order.email,
    subject: `Your VPS Details - ${order.id}`,
    html: deliveryEmailHtml(order)
  });
  return updateOrder(order.id, { deliveryEmailSent: true });
}

async function supabaseRequest(table, { method = "GET", query = "", body, prefer = "return=representation" } = {}) {
  requireSupabase();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data && (data.message || data.error || data.hint || data.details);
    throw new Error(message || "Supabase request failed.");
  }
  return data;
}

async function ensureDefaultProducts() {
  const rows = await supabaseRequest("products", {
    query: "?select=id&limit=1",
    prefer: "return=minimal"
  });
  if (Array.isArray(rows) && rows.length > 0) {
    return;
  }
  await supabaseRequest("products", {
    method: "POST",
    body: DEFAULT_PRODUCTS.map(mapProductToRow)
  });
}

async function getProducts() {
  await ensureDefaultProducts();
  const rows = await supabaseRequest("products", {
    query: "?select=*&order=price.asc"
  });
  return rows.map(mapProductRow);
}

async function addProduct(product) {
  const rows = await supabaseRequest("products", {
    method: "POST",
    body: [mapProductToRow(product)]
  });
  return mapProductRow(rows[0]);
}

async function removeProduct(productId) {
  await supabaseRequest("products", {
    method: "DELETE",
    query: `?id=eq.${encodeURIComponent(productId)}`,
    prefer: "return=minimal"
  });
}

async function getOrders() {
  const rows = await supabaseRequest("orders", {
    query: "?select=*&order=created_at.desc"
  });
  return rows.map(mapOrderRow);
}

async function findOrder(orderId) {
  const rows = await supabaseRequest("orders", {
    query: `?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`
  });
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

async function upsertOrder(order) {
  const rows = await supabaseRequest("orders", {
    method: "POST",
    query: "?on_conflict=id",
    body: [mapOrderToRow(order)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return mapOrderRow(rows[0]);
}

async function updateOrder(orderId, updater) {
  const current = await findOrder(orderId);
  if (!current) {
    return null;
  }
  const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  return upsertOrder(next);
}

function mapPaymentStatus(cashfreeOrderStatus) {
  const status = String(cashfreeOrderStatus || "").toUpperCase();
  if (status === "PAID") {
    return "Successful";
  }
  if (status === "ACTIVE") {
    return "Pending";
  }
  if (status === "EXPIRED" || status === "TERMINATED") {
    return "Failed";
  }
  return "Pending";
}

function deriveOrderStatus(paymentStatus, currentOrderStatus) {
  if (currentOrderStatus === "Delivered") {
    return currentOrderStatus;
  }
  if (paymentStatus === "Successful" || paymentStatus === "Paid") {
    return currentOrderStatus === "Processing" ? "Processing" : "Hold";
  }
  return "Pending";
}

async function cashfreeRequest(method, pathname, body) {
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    throw new Error("Cashfree credentials are not configured.");
  }

  const response = await fetch(`${CASHFREE_API_BASE}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || data.error || "Cashfree request failed.");
  }
  return data;
}

async function createCashfreeOrder(order, product) {
  return cashfreeRequest("POST", "/orders", {
    order_id: order.id,
    order_amount: Number(product.price),
    order_currency: "INR",
    customer_details: {
      customer_id: order.id,
      customer_name: order.customerName,
      customer_email: order.email,
      customer_phone: order.phone
    },
    order_meta: {
      return_url: `${BASE_URL}/payment-return.html?order_id={order_id}`
    },
    order_note: order.note || `${product.type} order for ${product.name}`
  });
}

async function fetchCashfreeOrder(orderId) {
  return cashfreeRequest("GET", `/orders/${encodeURIComponent(orderId)}`);
}

function verifyWebhookSignature(rawBody, signature, timestamp) {
  const signedPayload = timestamp + rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", CASHFREE_SECRET_KEY)
    .update(signedPayload)
    .digest("base64");
  const actualBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function serveStatic(req, res, pathname) {
  let safePath = pathname === "/" ? "/index.html" : pathname;
  safePath = safePath.replace(/^\/+/, "");
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    notFound(res);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, {
      cashfreeMode: CASHFREE_ENV,
      cashfreeConfigured: Boolean(CASHFREE_APP_ID && CASHFREE_SECRET_KEY),
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      emailConfigured: canSendEmails()
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const products = await getProducts();
    sendJson(res, 200, { products });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = parseJsonBody(await readBody(req));
    const products = await getProducts();
    const product = products.find((item) => item.id === body.productId);
    if (!product) {
      sendJson(res, 400, { error: "Invalid product." });
      return;
    }
    if (!body.email || !body.customerName || !body.phone) {
      sendJson(res, 400, { error: "Name, email, and phone are required." });
      return;
    }

    const order = {
      id: generateOrderId(),
      productId: product.id,
      productName: product.name,
      customerName: body.customerName,
      email: body.email,
      phone: body.phone,
      telegramId: body.telegramId || "",
      note: body.note || "",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      createdAt: nowStamp(),
      deliveryMethod: "",
      credentials: null,
      cashfreeOrderId: "",
      cashfreeOrderStatus: "ACTIVE",
      paymentSessionId: "",
      orderReceivedEmailSent: false,
      paymentSuccessEmailSent: false,
      deliveryEmailSent: false
    };

    const savedOrder = await upsertOrder(order);
    try {
      await sendOrderReceivedEmail(savedOrder);
    } catch (error) {
      console.error("Order email failed:", error.message);
    }

    try {
      const cashfree = await createCashfreeOrder(savedOrder, product);
      const updated = await updateOrder(savedOrder.id, {
        cashfreeOrderId: cashfree.order_id,
        cashfreeOrderStatus: cashfree.order_status || "ACTIVE",
        paymentSessionId: cashfree.payment_session_id || ""
      });
      sendJson(res, 201, {
        order: updated,
        paymentSessionId: cashfree.payment_session_id,
        cashfreeOrderId: cashfree.order_id
      });
    } catch (error) {
      sendJson(res, 500, {
        error: error.message,
        hint: "Check Cashfree and Supabase environment variables."
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/track") {
    const orderId = url.searchParams.get("orderId");
    const order = await findOrder(orderId);
    if (!order) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    sendJson(res, 200, { order });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/payments/verify") {
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      sendJson(res, 400, { error: "Order ID is required." });
      return;
    }
    const existing = await findOrder(orderId);
    if (!existing) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    try {
      const remote = await fetchCashfreeOrder(existing.cashfreeOrderId || existing.id);
      const paymentStatus = mapPaymentStatus(remote.order_status);
      const updated = await updateOrder(existing.id, (order) => ({
        ...order,
        cashfreeOrderId: remote.order_id || order.cashfreeOrderId || order.id,
        cashfreeOrderStatus: remote.order_status || order.cashfreeOrderStatus,
        paymentStatus,
        orderStatus: deriveOrderStatus(paymentStatus, order.orderStatus)
      }));
      try {
        await sendPaymentSuccessEmail(updated);
      } catch (error) {
        console.error("Payment email failed:", error.message);
      }
      sendJson(res, 200, { order: updated });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/payments/session") {
    const orderId = url.searchParams.get("orderId");
    const order = await findOrder(orderId);
    if (!order) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    if (!order.paymentSessionId) {
      sendJson(res, 404, { error: "Payment session not available for this order." });
      return;
    }
    sendJson(res, 200, { paymentSessionId: order.paymentSessionId });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cashfree/webhook") {
    const rawBody = await readBody(req);
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    if (!signature || !timestamp || !verifyWebhookSignature(rawBody, signature, timestamp)) {
      sendJson(res, 401, { error: "Invalid webhook signature." });
      return;
    }

    const body = parseJsonBody(rawBody);
    const entity = body.data || {};
    const orderEntity = entity.order || {};
    const paymentEntity = entity.payment || {};
    const orderId = orderEntity.order_id;
    if (!orderId) {
      sendJson(res, 400, { error: "Webhook missing order ID." });
      return;
    }

    const paymentStatus =
      String(paymentEntity.payment_status || "").toUpperCase() === "SUCCESS"
        ? "Successful"
        : mapPaymentStatus(orderEntity.order_status);

    const updated = await updateOrder(orderId, (order) => ({
      ...order,
      cashfreeOrderId: orderEntity.order_id || order.cashfreeOrderId || order.id,
      cashfreeOrderStatus: orderEntity.order_status || order.cashfreeOrderStatus,
      paymentStatus,
      orderStatus: deriveOrderStatus(paymentStatus, order.orderStatus)
    }));
    try {
      await sendPaymentSuccessEmail(updated);
    } catch (error) {
      console.error("Webhook payment email failed:", error.message);
    }

    sendJson(res, 200, { ok: true, order: updated || null });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = parseJsonBody(await readBody(req));
    if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: "Invalid login." });
      return;
    }

    const token = createAdminToken();
    sendJson(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": sessionCookie(token)
      }
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    sendJson(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": sessionCookie("", 0)
      }
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/session") {
    sendJson(res, 200, { authenticated: Boolean(getAdminSession(req)) });
    return;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!requireAdmin(req, res)) {
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    const orders = (await getOrders()).map((order) => ({
      id: order.id,
      productName: order.productName,
      email: order.email,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus
    }));
    sendJson(res, 200, { orders });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/products") {
    const body = parseJsonBody(await readBody(req));
    const product = await addProduct({
      id: `prd-${String(body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
      type: body.type,
      name: body.name,
      ram: body.ram,
      cpu: body.cpu,
      storage: body.storage,
      price: Number(body.price),
      description: body.description
    });
    sendJson(res, 201, { product });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await removeProduct(id);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/orders/payment") {
    const body = parseJsonBody(await readBody(req));
    const updated = await updateOrder(body.orderId, (order) => ({
      ...order,
      paymentStatus: body.paymentStatus,
      orderStatus: deriveOrderStatus(body.paymentStatus, order.orderStatus)
    }));
    if (!updated) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    sendJson(res, 200, { order: updated });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/orders/processing") {
    const body = parseJsonBody(await readBody(req));
    const updated = await updateOrder(body.orderId, { orderStatus: "Processing" });
    if (!updated) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    sendJson(res, 200, { order: updated });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/orders/deliver") {
    const body = parseJsonBody(await readBody(req));
    const updated = await updateOrder(body.orderId, (order) => ({
      ...order,
      paymentStatus: "Successful",
      orderStatus: "Delivered",
      deliveryMethod: body.deliveryMethod,
      credentials: {
        username: body.username,
        password: body.password,
        ipAddress: body.ipAddress,
        note: body.note || ""
      }
    }));
    if (!updated) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    try {
      await sendDeliveryEmail(updated);
    } catch (error) {
      console.error("Delivery email failed:", error.message);
    }
    sendJson(res, 200, { order: updated });
    return;
  }

  notFound(res);
}

const requestHandler = async (req, res) => {
  try {
    const url = new URL(req.url, BASE_URL);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
};

if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`SkyNode server running on ${BASE_URL}`);
  });
}

module.exports = requestHandler;
