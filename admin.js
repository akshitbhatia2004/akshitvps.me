function getProductMessageElement() {
  return document.getElementById("productMessage") || document.getElementById("adminLoginMessage");
}

function setProductFormMode(editing) {
  const submitButton = document.getElementById("productSubmitButton");
  const cancelButton = document.getElementById("productCancelButton");
  if (submitButton) {
    submitButton.textContent = editing ? "Update Product" : "Add Product";
  }
  if (cancelButton) {
    cancelButton.classList.toggle("hidden", !editing);
  }
}

function resetProductForm(message = "") {
  const form = document.getElementById("productForm");
  if (form) {
    form.reset();
  }
  const productId = document.getElementById("productId");
  if (productId) {
    productId.value = "";
  }
  setProductFormMode(false);
  const productMessage = getProductMessageElement();
  if (productMessage) {
    productMessage.textContent = message;
  }
}

async function renderAdminProducts() {
  const list = document.getElementById("adminProductList");
  if (!list) {
    return;
  }

  const { products } = await SkyNodeApp.request("/api/products");
  list.innerHTML = products.map((product) => `
    <div class="product-card">
      <div class="nav">
        <div>
          <span class="chip">${product.type}</span>
          <h3>${product.name}</h3>
        </div>
        <div class="admin-actions">
          <button class="mini-button edit-product" data-product-id="${product.id}" type="button">Edit</button>
          <button class="mini-button delete-product" data-product-id="${product.id}" type="button">Delete</button>
        </div>
      </div>
      <p>${product.description}</p>
      <div class="meta">
        <div><strong>RAM</strong><p>${product.ram}</p></div>
        <div><strong>CPU</strong><p>${product.cpu}</p></div>
        <div><strong>Storage</strong><p>${product.storage}</p></div>
        <div><strong>Price</strong><p>${SkyNodeApp.currency(product.price)}</p></div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".edit-product").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === button.dataset.productId);
      if (!product) {
        return;
      }
      document.getElementById("productId").value = product.id;
      document.getElementById("productName").value = product.name;
      document.getElementById("productType").value = product.type;
      document.getElementById("productRam").value = product.ram;
      document.getElementById("productCpu").value = product.cpu;
      document.getElementById("productStorage").value = product.storage;
      document.getElementById("productPrice").value = product.price;
      document.getElementById("productDescription").value = product.description;
      setProductFormMode(true);
      const productMessage = getProductMessageElement();
      if (productMessage) {
        productMessage.textContent = `Editing ${product.name}`;
      }
      document.getElementById("productName").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  list.querySelectorAll(".delete-product").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await SkyNodeApp.request(`/api/admin/products/${encodeURIComponent(button.dataset.productId)}`, {
          method: "DELETE"
        });
        resetProductForm("Product deleted successfully.");
        renderAdminProducts().catch(showAdminMessage);
      } catch (error) {
        const productMessage = getProductMessageElement();
        if (productMessage) {
          productMessage.textContent = error.message;
        }
      }
    });
  });
}

async function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) {
    return;
  }

  const { orders } = await SkyNodeApp.request("/api/admin/orders");
  tbody.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.productName}</td>
      <td>${order.email}</td>
      <td>${SkyNodeApp.paymentBadge(order.paymentStatus)}</td>
      <td>${SkyNodeApp.orderBadge(order.orderStatus)}</td>
      <td>
        <div class="admin-actions">
          <button class="mini-button action-payment" data-order-id="${order.id}" data-status="Paid" type="button">Paid</button>
          <button class="mini-button action-payment" data-order-id="${order.id}" data-status="Failed" type="button">Failed</button>
          <button class="mini-button action-payment" data-order-id="${order.id}" data-status="Successful" type="button">Successful</button>
          <button class="mini-button action-fill" data-order-id="${order.id}" type="button">Load</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".action-payment").forEach((button) => {
    button.addEventListener("click", async () => {
      await SkyNodeApp.request("/api/admin/orders/payment", {
        method: "POST",
        body: JSON.stringify({
          orderId: button.dataset.orderId,
          paymentStatus: button.dataset.status
        })
      });
      renderOrdersTable().catch(showAdminMessage);
    });
  });

  tbody.querySelectorAll(".action-fill").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("deliveryOrderId").value = button.dataset.orderId;
      document.getElementById("deliveryMessage").textContent = `Loaded ${button.dataset.orderId} into manual delivery form.`;
    });
  });
}

function showDashboard() {
  document.getElementById("adminLoginSection").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdminProducts().catch(showAdminMessage);
  renderOrdersTable().catch(showAdminMessage);
}

function showAdminMessage(error) {
  const message = document.getElementById("deliveryMessage") || document.getElementById("adminLoginMessage");
  if (message) {
    message.textContent = error.message || String(error);
  }
}

function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("adminLoginMessage");
  if (!form || !message) {
    return;
  }

  SkyNodeApp.request("/api/admin/session")
    .then(({ authenticated }) => {
      if (authenticated) {
        showDashboard();
      }
    })
    .catch(() => {});

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value;
    try {
      await SkyNodeApp.request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      message.textContent = "";
      showDashboard();
      return;
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById("adminLogoutButton").addEventListener("click", async () => {
    await SkyNodeApp.request("/api/admin/logout", { method: "POST" });
    window.location.reload();
  });
}

function setupProductForm() {
  const form = document.getElementById("productForm");
  const cancelButton = document.getElementById("productCancelButton");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("productName").value.trim();
    const productId = document.getElementById("productId").value.trim();
    const payload = {
      type: document.getElementById("productType").value,
      name,
      ram: document.getElementById("productRam").value.trim(),
      cpu: document.getElementById("productCpu").value.trim(),
      storage: document.getElementById("productStorage").value.trim(),
      price: document.getElementById("productPrice").value,
      description: document.getElementById("productDescription").value.trim()
    };
    try {
      if (productId) {
        await SkyNodeApp.request(`/api/admin/products/${encodeURIComponent(productId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        resetProductForm("Product updated successfully.");
      } else {
        await SkyNodeApp.request("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        resetProductForm("Product added successfully.");
      }
      renderAdminProducts().catch(showAdminMessage);
    } catch (error) {
      const productMessage = getProductMessageElement();
      if (productMessage) {
        productMessage.textContent = error.message;
      }
    }
  });

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      resetProductForm();
    });
  }
}

function setupDeliveryForm() {
  const form = document.getElementById("deliveryForm");
  const message = document.getElementById("deliveryMessage");
  const processingButton = document.getElementById("markProcessingButton");
  if (!form || !message || !processingButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const orderId = document.getElementById("deliveryOrderId").value.trim();
    try {
      await SkyNodeApp.request("/api/admin/orders/deliver", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          deliveryMethod: document.getElementById("deliveryMethod").value,
          username: document.getElementById("deliveryUsername").value.trim(),
          password: document.getElementById("deliveryPassword").value.trim(),
          ipAddress: document.getElementById("deliveryIp").value.trim(),
          note: document.getElementById("deliveryNote").value.trim()
        })
      });
      message.textContent = `Order ${orderId} marked delivered. Credentials were saved to the record.`;
      renderOrdersTable().catch(showAdminMessage);
      form.reset();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  processingButton.addEventListener("click", async () => {
    const orderId = document.getElementById("deliveryOrderId").value.trim();
    try {
      await SkyNodeApp.request("/api/admin/orders/processing", {
        method: "POST",
        body: JSON.stringify({ orderId })
      });
      message.textContent = `Order ${orderId} marked as Processing.`;
      renderOrdersTable().catch(showAdminMessage);
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

setupAdminLogin();
setupProductForm();
setupDeliveryForm();
