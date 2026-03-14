function getOrderIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("orderId") || params.get("order_id");
}

function redirectAfterReturn() {
  const message = document.getElementById("paymentReturnMessage");
  if (!message) {
    return false;
  }

  const orderId = getOrderIdFromQuery();
  if (!orderId) {
    message.textContent = "Missing order ID in Cashfree return URL.";
    return true;
  }

  SkyNodeApp.request(`/api/payments/verify?orderId=${encodeURIComponent(orderId)}`)
    .then(({ order }) => {
      const target = order.paymentStatus === "Successful" ? "payment-success.html" : "payment-failed.html";
      window.location.replace(`${target}?orderId=${encodeURIComponent(order.id)}`);
    })
    .catch((error) => {
      message.textContent = error.message;
    });
  return true;
}

function renderStatusMeta() {
  if (redirectAfterReturn()) {
    return;
  }

  const meta = document.getElementById("statusOrderMeta");
  if (!meta) {
    return;
  }

  const orderId = getOrderIdFromQuery();
  if (!orderId) {
    meta.innerHTML = "<p>No order data found in this page.</p>";
    return;
  }

  SkyNodeApp.request(`/api/orders/track?orderId=${encodeURIComponent(orderId)}`)
    .then(({ order }) => {
      meta.innerHTML = `
        <div class="result-grid">
          <div><span>Order ID</span><strong>${order.id}</strong></div>
          <div><span>Product</span><strong>${order.productName}</strong></div>
          <div><span>Payment Status</span><strong>${order.paymentStatus}</strong></div>
          <div><span>Order Status</span><strong>${order.orderStatus}</strong></div>
        </div>
      `;

      const actions = document.getElementById("paymentActions");
      if (actions && window.location.pathname.toLowerCase().endsWith("order-success.html")) {
        actions.innerHTML = `<button id="cashfreePayNow" class="btn btn-primary" type="button">Pay with Cashfree</button>`;
        document.getElementById("cashfreePayNow").addEventListener("click", async () => {
          try {
            let sessionId = sessionStorage.getItem(`payment_session_${order.id}`);
            if (!sessionId) {
              const session = await SkyNodeApp.request(`/api/payments/session?orderId=${encodeURIComponent(order.id)}`);
              sessionId = session.paymentSessionId;
            }
            const config = await SkyNodeApp.request("/api/config");
            const cashfree = window.Cashfree({
              mode: config.cashfreeMode
            });
            await cashfree.checkout({
              paymentSessionId: sessionId,
              redirectTarget: "_self"
            });
          } catch (error) {
            actions.innerHTML = `<p>${error.message}</p>`;
          }
        });
      }
    })
    .catch((error) => {
      meta.innerHTML = `<p>${error.message}</p>`;
    });
}

renderStatusMeta();
