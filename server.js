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

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const sessions = new Map();
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

const CASHFREE_API_BASE =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

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

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(DEFAULT_PRODUCTS, null, 2));
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

function readBody(req) {
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

function createToken() {
  return crypto.randomBytes(24).toString("hex");
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

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.skynode_admin_session;
  if (!token) {
    return null;
  }
  return sessions.get(token) || null;
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
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

function getProducts() {
  const products = readJson(PRODUCTS_FILE);
  if (Array.isArray(products) && products.length > 0) {
    return products;
  }
  writeJson(PRODUCTS_FILE, DEFAULT_PRODUCTS);
  return DEFAULT_PRODUCTS;
}

function saveProducts(products) {
  writeJson(PRODUCTS_FILE, products);
}

function getOrders() {
  return readJson(ORDERS_FILE);
}

function saveOrders(orders) {
  writeJson(ORDERS_FILE, orders);
}

function findOrder(orderId) {
  return getOrders().find((order) => order.id === orderId);
}

function updateOrder(orderId, updater) {
  const orders = getOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) {
    return null;
  }
  const current = orders[index];
  const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  orders[index] = next;
  saveOrders(orders);
  return next;
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
      cashfreeConfigured: Boolean(CASHFREE_APP_ID && CASHFREE_SECRET_KEY)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    sendJson(res, 200, { products: getProducts() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = parseJsonBody(await readBody(req));
    const products = getProducts();
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
      paymentSessionId: ""
    };

    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);

    try {
      const cashfree = await createCashfreeOrder(order, product);
      const updated = updateOrder(order.id, {
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
        hint: "Check Cashfree credentials and API access in .env."
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/track") {
    const orderId = url.searchParams.get("orderId");
    const order = findOrder(orderId);
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
    const existing = findOrder(orderId);
    if (!existing) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    try {
      const remote = await fetchCashfreeOrder(existing.cashfreeOrderId || existing.id);
      const paymentStatus = mapPaymentStatus(remote.order_status);
      const updated = updateOrder(existing.id, (order) => ({
        ...order,
        cashfreeOrderId: remote.order_id || order.cashfreeOrderId || order.id,
        cashfreeOrderStatus: remote.order_status || order.cashfreeOrderStatus,
        paymentStatus,
        orderStatus: deriveOrderStatus(paymentStatus, order.orderStatus)
      }));
      sendJson(res, 200, { order: updated });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/payments/session") {
    const orderId = url.searchParams.get("orderId");
    const order = findOrder(orderId);
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

    const updated = updateOrder(orderId, (order) => {
      if (!order) {
        return order;
      }
      return {
        ...order,
        cashfreeOrderId: orderEntity.order_id || order.cashfreeOrderId || order.id,
        cashfreeOrderStatus: orderEntity.order_status || order.cashfreeOrderStatus,
        paymentStatus,
        orderStatus: deriveOrderStatus(paymentStatus, order.orderStatus)
      };
    });

    sendJson(res, 200, { ok: true, order: updated || null });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = parseJsonBody(await readBody(req));
    if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: "Invalid login." });
      return;
    }
    const token = createToken();
    sessions.set(token, {
      username: ADMIN_USERNAME,
      createdAt: Date.now()
    });
    sendJson(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": `skynode_admin_session=${token}; HttpOnly; Path=/; SameSite=Lax`
      }
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    const cookies = parseCookies(req);
    if (cookies.skynode_admin_session) {
      sessions.delete(cookies.skynode_admin_session);
    }
    sendJson(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": "skynode_admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
      }
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/session") {
    sendJson(res, 200, { authenticated: Boolean(getSession(req)) });
    return;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!requireAdmin(req, res)) {
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    const orders = getOrders().map((order) => ({
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
    const products = getProducts();
    const product = {
      id: `prd-${String(body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
      type: body.type,
      name: body.name,
      ram: body.ram,
      cpu: body.cpu,
      storage: body.storage,
      price: Number(body.price),
      description: body.description
    };
    products.push(product);
    saveProducts(products);
    sendJson(res, 201, { product });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const products = getProducts().filter((product) => product.id !== id);
    saveProducts(products);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/orders/payment") {
    const body = parseJsonBody(await readBody(req));
    const updated = updateOrder(body.orderId, (order) => ({
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
    const updated = updateOrder(body.orderId, { orderStatus: "Processing" });
    if (!updated) {
      sendJson(res, 404, { error: "Order not found." });
      return;
    }
    sendJson(res, 200, { order: updated });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/orders/deliver") {
    const body = parseJsonBody(await readBody(req));
    const updated = updateOrder(body.orderId, (order) => ({
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

ensureDataFiles();

if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`SkyNode server running on ${BASE_URL}`);
  });
}

module.exports = requestHandler;
