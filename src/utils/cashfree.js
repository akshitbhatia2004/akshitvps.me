export async function startPayment(plan, customer) {
  const resp = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: plan.price,
      customer: {
        email: customer.email,
        name: customer.name
      }
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    alert('Payment failed to start: ' + (data.error || JSON.stringify(data)));
    return;
  }

  console.log('Cashfree create order response', data);

  if (data.payment_link || data.data?.payment_link) {
    const link = data.payment_link || data.data.payment_link;
    window.location.href = link;
    return;
  }

  const paymentSessionId =
    data.payment_session_id ||
    data.data?.payment_sessions?.[0]?.payment_session_id ||
    data.payment_sessions_id;

  if (!paymentSessionId) {
    alert('No payment session returned. Check create-order response in console.');
    return;
  }

  if (window.cashfree && typeof window.cashfree.checkout === 'function') {
    window.cashfree.checkout({
      paymentSessionId,
      environment:
        process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST'
    });
  } else {
    console.warn('Cashfree SDK not loaded — redirecting if possible');
  }
}
