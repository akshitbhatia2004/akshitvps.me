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

export default function App(){
  const [plans, setPlans] = useLocalStorage('akshitvps_plans', DEFAULT_PLANS);
  const [orders, setOrders] = useLocalStorage('akshitvps_orders', []);
  const [route, setRoute] = useState('home');
  const [adminAuthed, setAdminAuthed] = useState(false);

  function adminLogin(p){
    const expected = (import.meta.env.VITE_ADMIN_PASSWORD) || 'admin123';
    if(p === expected){ setAdminAuthed(true); return true; }
    return false;
  }

  function addPlan(plan){ setPlans(prev=>[{...plan, id: plan.id || 'p_'+Math.random().toString(36).slice(2,6)}, ...prev]); }
  function removePlan(id){ setPlans(prev=> prev.filter(p=>p.id!==id)); }
  function markOrderPaid(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'paid'} : o)); }
  function refundOrder(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'refunded'} : o)); }

  async function handleBuy(plan){
  try{
    // create order on server
    const resp = await fetch('/api/create-order', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        amount: plan.price,
        customer: { name: 'Test User', email: 'test+1@example.com', phone: '9999999999' },
        metadata: { planId: plan.id }
      })
    });

    const data = await resp.json();
    console.log('create-order response:', data);

    // 1) if server returns a hosted payment link -> redirect
    const paymentLink = data.payment_link || (data.data && data.data.payment_link);
    if (paymentLink) {
      console.log('Redirecting to payment_link', paymentLink);
      window.location.href = paymentLink;
      return;
    }

    // 2) find a session id in the response
    const sessionId = data.payment_session_id || (data.data && data.data.payment_sessions && data.data.payment_sessions[0] && data.data.payment_sessions[0].payment_session_id);
    console.log('sessionId:', sessionId);

    if (!sessionId) {
      alert('No payment link or session_id returned. Check console for create-order response.');
      return;
    }

    // 3) Try Cashfree SDK (two common globals)
    // Try window.cashfree first (some docs/examples use this)
    if (typeof window.cashfree !== 'undefined' && typeof window.cashfree.checkout === 'function') {
      console.log('Using window.cashfree.checkout SDK');
      window.cashfree.checkout({ paymentSessionId: sessionId, environment: 'TEST' });
      return;
    }

    // Try window.Cashfree (other docs use this)
    if (typeof window.Cashfree !== 'undefined') {
  console.log("Using Cashfree Web SDK V3");

  const cashfree = window.Cashfree({ mode: "sandbox" });

  cashfree.checkout({
    paymentSessionId: sessionId,
    redirectTarget: "_self"
  });

  return;
    }
        if (typeof cf.open === 'function') {
          cf.open({ paymentSessionId: sessionId });
          return;
        }
      } catch (e) {
        console.warn('Error calling window.Cashfree methods', e);
      }
    }

    // 4) SDK not loaded or methods not found -> fallback to hosted checkout redirect (sandbox)
    // NOTE: if this particular hosted URL doesn't match your Cashfree account, try opening the sandbox URL shown in server logs
    const fallbackUrl = `https://sandbox.cashfree.com/pg/checkout?payment_session_id=${encodeURIComponent(sessionId)}`;
    console.warn('Cashfree SDK not found — falling back to redirect URL:', fallbackUrl);
    window.location.href = fallbackUrl;

  } catch (e) {
    console.error('handleBuy error', e);
    alert('Payment start failed: ' + (e.message || e));
  }
  }

  return (
    <div className="container">
      <header style={{ display:'flex', justifyContent:'space-between' }}>
        <div>
          <h1>AkshitVPS</h1>
          <div>Gaming VPS · Noida IPs</div>
        </div>
        <nav>
          <button onClick={()=>setRoute('home')}>Home</button>
          <button onClick={()=>setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main style={{ marginTop:20 }}>
        {route==='home' && (
          <section>
            <h2>Plans</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              {plans.map(p=>(
                <div key={p.id} style={{ padding:12, background:'#0b0b0b', borderRadius:12 }}>
                  <div style={{ fontWeight:700 }}>{p.title}</div>
                  <div style={{ color:'#999' }}>{p.cpu} • {p.ram} • {p.disk}</div>
                  <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontWeight:800 }}>₹{p.price}</div>
                    <button onClick={()=>handleBuy(p)} style={{ background:'#ff007a', padding:'8px 10px' }}>Buy</button>
                  </div>
                </div>
              ))}
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
