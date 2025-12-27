// lib/orderStore.js
let orders = [];

export function createOrder(order) {
  orders.push(order);
}

export function markOrderPaid(orderId) {
  const o = orders.find(o => o.orderId === orderId);
  if (o) o.status = "paid";
}

export function getOrders() {
  return orders;
}
