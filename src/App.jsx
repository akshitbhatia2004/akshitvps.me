import React, { useState } from 'react';
import AdminPanel from './components/AdminPanel';

const DEFAULT_PLANS = [
  { id: 'vps-1', title: 'VPS 2C / 2GB', cpu: '2 Core', ram: '2GB', disk: '50GB', price: 400 },
  { id: 'vps-2', title: 'VPS 2C / 4GB', cpu: '2 Core', ram: '4GB', disk: '50GB', price: 500 },
  { id: 'vps-3', title: 'VPS 4C / 8GB', cpu: '4 Core', ram: '8GB', disk: '50GB', price: 700 },
  { id: 'vps-4', title: 'VPS 4C / 12GB', cpu: '4 Core', ram: '12GB', disk: '80GB', price: 850 },
  { id: 'vps-5', title: 'VPS 4C / 16GB', cpu: '4 Core', ram: '16GB', disk: '80GB', price: 1200 }
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
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const [adminAuthed, setAdminAuthed] = useState(false);
  function adminLogin(p){ // check env var via Vite (client) if present otherwise default
    const expected = (import.meta.env.VITE_ADMIN_PASSWORD) || 'admin123';
    if(p === expected){ setAdminAuthed(true); return true; }
    return false;
  }

  function addPlan(plan){ setPlans(prev=>[{...plan, id: plan.id || 'p_'+Math.random().toString(36).slice(2,6)}, ...prev]); }
  function removePlan(id){ setPlans(prev=> prev.filter(p=>p.id!==id)); }
  function markOrderPaid(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'paid'} : o)); }
  function refundOrder(id){ setOrders(prev=> prev.map(o=> o.id===id ? {...o, status:'refunded'} : o)); }

  async function startCheckout(plan){
    setCheckoutPlan(plan); setShowCheckout(true);
  }

  async function createOrderServer(plan, name, email){
    try{
      const resp = await fetch('/api/create-order', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ amount: plan.price, customer: { name, email }, metadata: { planId: plan.id } })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(JSON.stringify(data));
      return data;
    }catch(e){
      console.error('createOrder error', e);
      throw e;
    }
  }

  function createOrderLocal(plan, name, email){
    const order = { id: 'ord_'+Math.random().toString(36).slice(2,9), planId: plan.id, planTitle: plan.title, price: plan.price, name, email, status: 'pending', createdAt: new Date().toISOString() };
    setOrders(prev=> [order, ...prev]);
    return order;
  }

  return (
    <div className="container">
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1>AkshitVPS</h1>
          <div style={{ color:'#9fb3c8' }}>Gaming VPS · Noida IPs</div>
        </div>
        <nav>
          <button onClick={()=>setRoute('home')}>Home</button>
          <button onClick={()=>setRoute('dashboard')}>Dashboard</button>
          <button onClick={()=>setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main style={{ marginTop:20 }}>
        {route === 'home' && (
          <>
            <section>
              <h2>Plans</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
                {plans.map(p=>(
                  <div key={p.id} style={{ padding:12, background:'#0b0b0b', borderRadius:12 }}>
                    <div style={{ fontWeight:700 }}>{p.title}</div>
                    <div style={{ color:'#999' }}>{p.cpu} • {p.ram} • {p.disk}</div>
                    <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontWeight:800 }}>₹{p.price}</div>
                      <button onClick={()=>startCheckout(p)} style={{ background:'#ff007a', padding:'8px 10px' }}>Buy</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {route === 'dashboard' && (
          <section>
            <h2>Customer Dashboard</h2>
            <p>Enter email to find orders</p>
            <Dashboard orders={orders} />
          </section>
        )}

        {route === 'admin' && (
          <AdminPanel authed={adminAuthed} onLogin={(p)=>adminLogin(p)} orders={orders} plans={plans} addPlan={addPlan} removePlan={removePlan} markPaid={markOrderPaid} refundOrder={refundOrder} />
        )}
      </main>

      {showCheckout && checkoutPlan && (
        <CheckoutModal plan={checkoutPlan} onClose={()=>{ setShowCheckout(false); setCheckoutPlan(null); }} onCreate={async ({name,email})=>{
          try{
            // Try server-side create order; if fails, fallback to local
            const data = await createOrderServer(checkoutPlan, name, email);
            // If Cashfree returns payment link, redirect
            const link = data.payment_link || data.data?.payment_link;
            if(link){
              window.location.href = link;
              return;
            }
            // Otherwise show message and store local order (demo)
            createOrderLocal(checkoutPlan, name, email);
            alert('Order created. Check dashboard.');
          }catch(e){
            createOrderLocal(checkoutPlan, name, email);
            alert('Demo order created locally.');
          } finally {
            setShowCheckout(false); setCheckoutPlan(null);
          }
        }} />
      )}
    </div>
  );
}

function Dashboard({ orders }){
  const [email, setEmail] = useState('');
  const myOrders = email ? orders.filter(o=> o.email?.toLowerCase() === email.toLowerCase()) : [];
  return (
    <div>
      <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
      {myOrders.length===0 ? <div>No orders</div> : myOrders.map(o=>(
        <div key={o.id} style={{ padding:8, background:'#0b0b0b', marginTop:8 }}>
          <div><strong>{o.planTitle}</strong> • ₹{o.price}</div>
          <div style={{ fontSize:12 }}>{o.id} • {o.status}</div>
        </div>
      ))}
    </div>
  );
}

function CheckoutModal({ plan, onClose, onCreate }){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)' }}>
      <div style={{ width:420, background:'#071018', padding:16, borderRadius:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800 }}>Checkout — {plan.title}</div>
          <button onClick={onClose}>X</button>
        </div>
        <div style={{ marginTop:8 }}>
          <label>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%', padding:8, marginTop:6 }} />
        </div>
        <div style={{ marginTop:8 }}>
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{ width:'100%', padding:8, marginTop:6 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:12 }}>
          <div>
            <div style={{ fontSize:12, color:'#9fb3c8' }}>Amount</div>
            <div style={{ fontWeight:800 }}>₹{plan.price}</div>
          </div>
          <div>
            <button onClick={()=>onCreate({ name, email })} style={{ background:'#ff007a', padding:'10px 14px' }}>Pay with Cashfree</button>
          </div>
        </div>
      </div>
    </div>
  );
}
