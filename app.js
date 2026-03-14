const SkyNodeApp = (() => {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  function currency(amount) {
    return `Rs. ${Number(amount).toFixed(2)}`;
  }

  function paymentBadge(status) {
    return `<span class="status-badge ${String(status).toLowerCase()}">${status}</span>`;
  }

  function orderBadge(status) {
    return `<span class="status-badge ${String(status).toLowerCase()}">${status}</span>`;
  }

  return {
    currency,
    orderBadge,
    paymentBadge,
    request
  };
})();
