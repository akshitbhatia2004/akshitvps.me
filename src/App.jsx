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

  // ✅ 1. DEFINE checkout FIRST
  const [checkout, setCheckout] = useState(() => {
  try {
    const saved = localStorage.getItem("akshitvps_checkout");
    return saved
      ? JSON.parse(saved)
      : { email: "", telegram: "", whatsapp: "" };
  } catch {
    return { email: "", telegram: "", whatsapp: "" };
  }
});

  React.useEffect(() => {
  localStorage.setItem(
    "akshitvps_checkout",
    JSON.stringify(checkout)
  );
}, [checkout]);



  // ✅ 2. THEN validate
  const isCheckoutValid =
    checkout.email &&
    checkout.telegram &&
    checkout.whatsapp;

  

  // ✅ 3. THEN helper
  function updateCheckout(key, value) {
    setCheckout(prev => ({
      ...prev,
      [key]: value
    }));
  }

  const [adminAuthed, setAdminAuthed] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);


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
    // 1️⃣ Basic validation
  if (!checkout.email || !checkout.telegram || !checkout.whatsapp) {
    alert("Email, Telegram number and WhatsApp number are required");
    return;
  }

  // ✅ EMAIL FORMAT VALIDATION (ADD HERE)
  const emailOk = /^\S+@\S+\.\S+$/.test(checkout.email);
  if (!emailOk) {
    alert("Please enter a valid email");
    return;
  }

  // 2️⃣ Phone validation (10 digits)
const phoneRegex = /^\d{10}$/;
if (!phoneRegex.test(checkout.telegram)) {
  alert("Telegram number must be 10 digits");
  return;
}
if (!phoneRegex.test(checkout.whatsapp)) {
  alert("WhatsApp number must be 10 digits");
  return;
}

   // 3️⃣ Start loading
setLoadingPlanId(plan.id);


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

    // 4️⃣ Open Cashfree checkout
    if (typeof window.Cashfree !== "undefined") {
      const cashfree = window.Cashfree({ mode: "production" });
      cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self"
      });
    } else {
      // fallback
      window.location.href =
        "https://sandbox.cashfree.com/pg/checkout?payment_session_id=" +
        sessionId;
    }
  } catch (e) {
    console.error(e);
    alert("Payment start failed");
  } finally {
    // 5️⃣ Stop loading
    setLoadingPlanId(null);
  }
}


  return (
  <div className="container">
    <header style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <h1>AkshitVPS</h1>
        <div>Ubuntu & RDP windows 11 VPS · Noida IPs</div>
      </div>
      <nav>
        <button onClick={() => setRoute('home')}>Home</button>
        <button onClick={() => setRoute('admin')}>Admin</button>
      </nav>
    </header>

    <main style={{ marginTop: 20 }}>
      {/* HOME */}
      {route === 'home' && (
        <>
          {/* CUSTOMER DETAILS */}
          <section style={{ marginBottom: 20 }}>
            <h2>Customer Details</h2>

            <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
              <input 
                autoFocus
                placeholder="Email"
                value={checkout.email}
                onChange={e => updateCheckout('email', e.target.value)}
              />

              <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Telegram Number"
                  value={checkout.telegram}
                  onChange={e =>
                    updateCheckout("telegram", e.target.value.replace(/\D/g, ""))
                  }
                />
                
              <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="WhatsApp Number"
                  value={checkout.whatsapp}
                  onChange={e =>
                    updateCheckout("whatsapp", e.target.value.replace(/\D/g, ""))
                  }
                />
            </div>

            {!isCheckoutValid && (
              <div style={{ marginTop: 8, color: '#ff6b6b' }}>
                Fill all details to continue
              </div>
            )}
          </section>

          {/* PLANS */}
          <section>
            <h2>Plans</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 12
              }}
            >
              {plans.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: 12,
                    background: '#0b0b0b',
                    borderRadius: 12
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div style={{ color: '#999' }}>
                    {p.cpu} • {p.ram} • {p.disk}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>₹{p.price}</div>

              <button
                    disabled={!isCheckoutValid || loadingPlanId !== null}
                    onClick={() => handleBuy(p)}
                    style={{
                      background: isCheckoutValid ? '#ff007a' : '#555',
                      padding: '8px 10px',
                      cursor:
                        !isCheckoutValid || loadingPlanId !== null
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: loadingPlanId !== null ? 0.6 : 1
                    }}
                  >
                    {loadingPlanId === p.id ? "Processing..." : "Buy"}
              </button>


                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ADMIN */}
      {route === 'admin' && (
        <AdminPanel
          authed={adminAuthed}
          onLogin={adminLogin}
          orders={orders}
          plans={plans}
          addPlan={addPlan}
          removePlan={removePlan}
          markPaid={markOrderPaid}
          refundOrder={refundOrder}
        />
      )}
    </main>
   </div>
);
}
