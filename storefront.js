let storefrontProducts = [];

async function renderStorefrontProducts() {
  const productGrid = document.getElementById("productGrid");
  const productSelect = document.getElementById("productId");
  const summary = document.getElementById("checkoutSummary");
  if (!productGrid || !productSelect || !summary) {
    return;
  }

  const { products } = await SkyNodeApp.request("/api/products");
  storefrontProducts = products;
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <span class="chip">${product.type}</span>
      <h3>${product.name}</h3>
      <p class="price">${SkyNodeApp.currency(product.price)} <small>/ month</small></p>
      <p>${product.description}</p>
      <div class="meta">
        <div><strong>RAM</strong><p>${product.ram}</p></div>
        <div><strong>CPU</strong><p>${product.cpu}</p></div>
        <div><strong>Storage</strong><p>${product.storage}</p></div>
        <div><strong>Delivery</strong><p>Within 24 hours</p></div>
      </div>
      <a href="#checkout" class="btn btn-primary choose-product" data-product-id="${product.id}">Order ${product.name}</a>
    </article>
  `).join("");

  productSelect.innerHTML = products.map((product) => `
    <option value="${product.id}">${product.name} - ${SkyNodeApp.currency(product.price)}</option>
  `).join("");

  function updateSummary() {
    const product = storefrontProducts.find((item) => item.id === productSelect.value);
    if (!product) {
      summary.innerHTML = "";
      return;
    }
    summary.innerHTML = `
      <strong>Selected product:</strong> ${product.name}<br>
      <strong>Specs:</strong> ${product.ram}, ${product.cpu}, ${product.storage}<br>
      <strong>Price:</strong> ${SkyNodeApp.currency(product.price)}<br>
      <strong>Delivery:</strong> Manual setup and credential delivery within 24 hours after successful payment.
    `;
  }

  updateSummary();
  productSelect.addEventListener("change", updateSummary);

  productGrid.querySelectorAll(".choose-product").forEach((button) => {
    button.addEventListener("click", () => {
      productSelect.value = button.dataset.productId;
      updateSummary();
    });
  });
}

function setupOrderForm() {
  const form = document.getElementById("orderForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const product = storefrontProducts.find((item) => item.id === document.getElementById("productId").value);
    if (!product) {
      return;
    }

    const payload = {
      productId: product.id,
      customerName: document.getElementById("customerName").value.trim(),
      email: document.getElementById("customerEmail").value.trim(),
      phone: document.getElementById("customerPhone").value.trim(),
      telegramId: document.getElementById("telegramId").value.trim(),
      note: document.getElementById("customerNote").value.trim()
    };

    SkyNodeApp.request("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(({ order, paymentSessionId }) => {
        sessionStorage.setItem(`payment_session_${order.id}`, paymentSessionId);
        window.location.href = `order-success.html?orderId=${encodeURIComponent(order.id)}`;
      })
      .catch((error) => {
        alert(error.message);
      });
  });
}

function renderTrackingResult(order) {
  if (!order) {
    return `
      <div class="status-badge failed">Not Found</div>
      <p>Order not found. Check the order ID and try again.</p>
    `;
  }

  return `
    ${SkyNodeApp.paymentBadge(order.paymentStatus)}
    ${SkyNodeApp.orderBadge(order.orderStatus)}
    <h3>${order.productName}</h3>
    <p>Customer: ${order.customerName}</p>
    <div class="result-grid">
      <div><span>Order ID</span><strong>${order.id}</strong></div>
      <div><span>Email</span><strong>${order.email}</strong></div>
      <div><span>Payment Status</span><strong>${order.paymentStatus}</strong></div>
      <div><span>Order Status</span><strong>${order.orderStatus}</strong></div>
      <div><span>Created</span><strong>${order.createdAt}</strong></div>
      <div><span>Delivery Method</span><strong>${order.deliveryMethod || "Waiting for admin"}</strong></div>
    </div>
  `;
}

function setupTracking() {
  const button = document.getElementById("trackingButton");
  const input = document.getElementById("trackingOrderId");
  const result = document.getElementById("trackingResult");
  if (!button || !input || !result) {
    return;
  }

  const run = () => {
    SkyNodeApp.request(`/api/orders/track?orderId=${encodeURIComponent(input.value.trim())}`)
      .then(({ order }) => {
        result.classList.remove("empty-state");
        result.innerHTML = renderTrackingResult(order);
      })
      .catch((error) => {
        result.classList.remove("empty-state");
        result.innerHTML = `
          <div class="status-badge failed">Not Found</div>
          <p>${error.message}</p>
        `;
      });
  };

  button.addEventListener("click", run);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      run();
    }
  });
}

function setupConfigMessage() {
  const element = document.getElementById("cashfreeConfigMessage");
  if (!element) {
    return;
  }
  SkyNodeApp.request("/api/config")
    .then((config) => {
      if (config.cashfreeConfigured) {
        element.textContent = `Cashfree ${config.cashfreeMode} mode is configured on the server.`;
      } else {
        element.textContent = "Cashfree credentials are not configured yet. Add them in the server .env file.";
      }
    })
    .catch(() => {
      element.textContent = "Unable to read server payment configuration.";
    });
}

renderStorefrontProducts().catch((error) => {
  const productGrid = document.getElementById("productGrid");
  if (productGrid) {
    productGrid.innerHTML = `<div class="panel"><p>${error.message}</p></div>`;
  }
});
setupOrderForm();
setupTracking();
setupConfigMessage();
