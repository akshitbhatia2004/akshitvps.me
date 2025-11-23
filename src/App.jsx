import React, { useState, useEffect } from 'react';

export default function App() {
  const [plans, setPlans] = useState([]);
  const [orders, setOrders] = useState([]);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [route, setRoute] = useState('home');
  const [authed, setAuthed] = useState(false);

  // Load plans and orders from serverless backend
  useEffect(() => {
    fetch('/api/get-plans').then(r => r.json()).then(setPlans).catch(() => {
      // fallback demo plans
      setPlans([
        { id: 'vps-1', title: 'VPS 2C / 2GB', price: 400 },
        { id: 'vps-2', title: 'VPS 2C / 4GB', price: 500 },
        { id: 'vps-3', title: 'VPS 4C / 8GB', price: 700 },
        { id: 'vps-4', title: 'VPS 4C / 12GB', price: 850 },
        { id: 'vps-5', title: 'VPS 4C / 16GB', price: 1200 }
      ])
    });

    fetch('/api/get-orders').then(r => r.json()).then(setOrders).catch(() => setOrders([]));
  }, []);

  function beginCheckout(plan) {
    setCheckoutPlan(plan);
    setShowCheckout(true);
  }

  async function handleCheckout({ name, email }) {
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: checkoutPlan.id, name, email })
      });
      const data = await res.json();
      alert('Order Created! Payment link: ' + (data.paymentLink || '#'));
      setShowCheckout(false);
      setCheckoutPlan(null);
      fetch('/api/get-orders').then(r => r.json()).then(setOrders);
    } catch (err) {
      alert('Error creating order: ' + err.message);
    }
  }

  function doAdminLogin(password) {
    if (password === process.env.ADMIN_PASSWORD) {
      setAuthed(true);
      return true;
    } else {
      alert('Wrong password');
      return false;
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>AkshitVPS</h1>
        <nav>
          <button onClick={() => setRoute('home')}>Home</button>
          <button onClick={() => setRoute('dashboard')}>Dashboard</button>
          <button onClick={() => setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main>
        {route === 'home' && (
          <div>
            <h2>Available Plans</h2>
            {plans.map(p => (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <b>{p.title}</b> — ₹{p.price}
                <button onClick={() => beginCheckout(p)} style={{ marginLeft: 10 }}>
                  Buy
                </button>
              </div>
            ))}
          </div>
        )}

        {route === 'dashboard' && <CustomerDashboard orders={orders} />}

        {route === 'admin' && (
          <AdminPanel
            authed={authed}
            doLogin={doAdminLogin}
            plans={plans}
            setPlans={setPlans}
            orders={orders}
            setOrders={setOrders}
          />
        )}
      </main>

      {showCheckout && checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={() => { setShowCheckout(false); setCheckoutPlan(null); }}
          onConfirm={handleCheckout}
        />
      )}
    </div>
  );
}

// -------------------- Checkout Modal --------------------
function CheckoutModal({ plan, onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ background: '#111', padding: 20, borderRadius: 8, width: 400 }}>
        <h2>Checkout — {plan.title}</h2>
        <input
          placeholder="Your Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />
        <input
          placeholder="Your Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />
        <div>
          <b>Amount: ₹{plan.price}</b>
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => onConfirm({ name, email })} style={{ marginRight: 10 }}>
            Pay with Cashfree
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// -------------------- Customer Dashboard --------------------
function CustomerDashboard({ orders }) {
  const [email, setEmail] = useState('');
  const myOrders = email ? orders.filter(o => o.email?.toLowerCase() === email.toLowerCase()) : [];

  return (
    <div>
      <h2>My Orders</h2>
      <input
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ marginBottom: 10, padding: 8, width: '100%' }}
      />
      {myOrders.length === 0 ? <p>No orders found</p> : myOrders.map(o => (
        <div key={o.id} style={{ marginBottom: 10 }}>
          {o.planTitle} — ₹{o.price} — Status: {o.status}
        </div>
      ))}
    </div>
  );
}

// -------------------- Admin Panel --------------------
function AdminPanel({ authed, doLogin, orders, setOrders }) {
  const [password, setPassword] = useState('');

  if (!authed) {
    return (
      <div>
        <h2>Admin Login</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => doLogin(password)}>Login</button>
      </div>
    );
  }

  const markPaid = async (orderId) => {
    await fetch('/api/mark-paid', { method: 'POST', body: JSON.stringify({ orderId }) });
    alert('Marked Paid');
    fetch('/api/get-orders').then(r => r.json()).then(setOrders);
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      {orders.length === 0 ? <p>No orders yet</p> :
        orders.map(o => (
          <div key={o.id} style={{ marginBottom: 10 }}>
            {o.planTitle} — {o.email} — Status: {o.status}
            {o.status !== 'paid' && <button onClick={() => markPaid(o.id)} style={{ marginLeft: 10 }}>Mark Paid</button>}
          </div>
        ))
      }
    </div>
  );
}
