import React, { useState } from 'react';
import AdminPanel from './components/AdminPanel';

const DEFAULT_PLANS = [
  { id: 'vps-1', title: 'VPS 2C / 2GB', cpu: '2 Core', ram: '2GB', disk: '50GB', price: 400 },
  { id: 'vps-2', title: 'VPS 2C / 4GB', cpu: '2 Core', ram: '4GB', disk: '50GB', price: 500 },
];

function useLocalStorage(key, initial){
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch(e){ return initial; }
  });
  React.useEffect(()=>{ localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState];
}

export default function App() {
  const [plans, setPlans] = useLocalStorage('akshitvps_plans', DEFAULT_PLANS);
  const [orders, setOrders] = useLocalStorage('akshitvps_orders', []);
  const [route, setRoute] = useState('home');

  const [checkout, setCheckout] = useState({
    email: "",
    telegram: "",
    whatsapp: ""
  });

  function updateCheckout(key, value) {
    setCheckout(prev => ({
      ...prev,
      [key]: value
    }));
  }

  const [adminAuthed, setAdminAuthed] = useState(false)

  function adminLogin(p){
    const expected = (import.meta.env.VITE_ADMIN_PASSWORD) || 'admin123';
    if(p === expected){ setAdminAuthed(true); return true; }
    return false;
  }

  function addPlan(plan){ setPlans(prev=>[{...plan, id: plan.id || 'p_'+Math.random().toString(36).slice(2,6)}, ...prev]); }
  function removePlan(id){ setPlans(prev=> prev.filter(p=>p.id!==id)); }
  function markOrderPaid(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'paid'} : o)); }
  function refundOrder(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'refunded'} : o)); }

  async function handleBuy(plan) {
  if (!checkout.email || !checkout.telegram || !checkout.whatsapp) {
    alert("Email, Telegram number and WhatsApp number are required");
    return;
  }

  try {
    const resp = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: plan.price,
        customer: {
          email: checkout.email,
          name: "VPS User",
          phone: checkout.whatsapp // fallback phone
        },
        telegram: checkout.telegram,
        whatsapp: checkout.whatsapp,
        metadata: { planId: plan.id }
      })
    });

    const data = await resp.json();
    console.log("create-order response:", data);

    const sessionId =
      data.payment_session_id ||
      data?.data?.payment_sessions?.[0]?.payment_session_id;

    if (!sessionId) {
      alert("Payment session not created");
      return;
    }

    if (typeof window.Cashfree !== "undefined") {
      const cashfree = window.Cashfree({ mode: "production" });
      cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self"
      });
      return;
    }

    window.location.href =
      "https://sandbox.cashfree.com/pg/checkout?payment_session_id=" +
      sessionId;
  } catch (e) {
    console.error(e);
    alert("Payment start failed");
  }
}

  return (
    <div className="container">
      <header style={{ display:'flex', justifyContent:'space-between' }}>
        <div>
          <h1>AkshitVPS</h1>
          <div>Ubuntu & RDP windows 11 VPS · Noida IPs</div>
        </div>
        <nav>
          <button onClick={()=>setRoute('home')}>Home</button>
          <button onClick={()=>setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main style={{ marginTop:20 }}>
        {route==='home' && (
          <section style={{ marginBottom: 20 }}>
  <h2>Customer Details</h2>

  <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
    <input
      placeholder="Email"
      value={checkout.email}
      onChange={e => updateCheckout("email", e.target.value)}
    />

    <input
      placeholder="Telegram Number"
      value={checkout.telegram}
      onChange={e => updateCheckout("telegram", e.target.value)}
    />

    <input
      placeholder="WhatsApp Number"
      value={checkout.whatsapp}
      onChange={e => updateCheckout("whatsapp", e.target.value)}
    />
  </div>
</section>
        )}

        {route==='admin' && (
          <AdminPanel authed={adminAuthed} onLogin={adminLogin} orders={orders} plans={plans} addPlan={addPlan} removePlan={removePlan} markPaid={markOrderPaid} refundOrder={refundOrder} />
        )}
      </main>
    </div>
  );
}
