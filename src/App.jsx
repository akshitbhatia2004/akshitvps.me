import React, { useState, useEffect } from 'react';

const DEFAULT_PLANS = [
  { id: 'vps-1', title: 'VPS 2C / 2GB', cpu: '2 Core', ram: '2GB', disk: '50GB', price: 400 },
  { id: 'vps-2', title: 'VPS 2C / 4GB', cpu: '2 Core', ram: '4GB', disk: '50GB', price: 500 },
  { id: 'vps-3', title: 'VPS 4C / 8GB', cpu: '4 Core', ram: '8GB', disk: '50GB', price: 700 },
  { id: 'vps-4', title: 'VPS 4C / 12GB', cpu: '4 Core', ram: '12GB', disk: '80GB', price: 850 },
  { id: 'vps-5', title: 'VPS 4C / 16GB', cpu: '4 Core', ram: '16GB', disk: '80GB', price: 1200 }
];

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch(e){ return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState];
}

export default function App(){
  const [plans, setPlans] = useLocalStorage('akshitvps_plans', DEFAULT_PLANS);
  const [orders, setOrders] = useLocalStorage('akshitvps_orders', []);
  const [route, setRoute] = useState('home');
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  function beginCheckout(plan){ setCheckoutPlan(plan); setShowCheckout(true); }

  async function createOrderServerSide({ planId, name, email }){
    // Call Vercel serverless API to create Cashfree order
    const plan = plans.find(p=>p.id===planId);
    if(!plan) throw new Error('Plan not found');
    const payload = {
      amount: plan.price,
      customer: { name, email }
    };
    const r = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!r.ok) throw new Error('Failed to create order');
    const data = await r.json();
    return data;
  }

  function createOrderLocal({ planId, name, email }){
    const plan = plans.find(p=>p.id===planId);
    const order = {
      id: 'ord_'+Math.random().toString(36).slice(2,9),
      planId, planTitle: plan.title, price: plan.price,
      name, email, status: 'pending', createdAt: new Date().toISOString(), ipLocation: 'Noida, India'
    };
    setOrders([order, ...orders]);
    return order;
  }

  return (
    <div style={{padding:20}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{width:48,height:48,background:'linear-gradient(90deg,#ff007a,#7c3aed)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:700}}>AV</div>
          <div>
            <div style={{fontWeight:800,fontSize:20}}>AkshitVPS</div>
            <div style={{fontSize:12,color:'#aaa'}}>Gaming VPS · Noida IPs</div>
          </div>
        </div>
        <nav>
          <button onClick={()=>setRoute('home')} style={{marginRight:8}}>Home</button>
          <button onClick={()=>setRoute('dashboard')} style={{marginRight:8}}>Dashboard</button>
          <button onClick={()=>setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main style={{marginTop:20}}>
        {route==='home' && (
          <>
            <section style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center'}}>
              <div>
                <h1 style={{fontSize:28}}>Fast Gaming VPS & Windows RDP — <span style={{color:'#ff007a'}}>Noida IPs</span></h1>
                <p style={{color:'#bbb'}}>Low-latency Indian IPs, ideal for game servers and remote desktops. Pay in INR with Cashfree.</p>
              </div>
              <div style={{width:300,padding:16,background:'#111',borderRadius:12}}>
                <div style={{fontWeight:700}}>Instant setup</div>
                <div style={{fontSize:12,color:'#aaa'}}>Ubuntu VPS & Windows 11 RDP</div>
              </div>
            </section>

            <section style={{marginTop:24}}>
              <h2>Plans — Gaming-style</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:12}}>
                {plans.map(p=>(
                  <div key={p.id} style={{padding:12,background:'#0b0b0b',borderRadius:12,border:'1px solid #222'}}>
                    <div style={{fontWeight:700}}>{p.title}</div>
                    <div style={{fontSize:12,color:'#999'}}>{p.cpu} • {p.ram} • {p.disk}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
                      <div style={{fontWeight:800}}>₹{p.price}</div>
                      <button onClick={()=>{ setCheckoutPlan(p); setShowCheckout(true); }} style={{background:'#ff007a',color:'#000',padding:'8px 10px',borderRadius:8}}>Buy</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {route==='dashboard' && (
          <CustomerDashboard orders={orders} />
        )}

        {route==='admin' && (
          <div>
            <h2>Admin Panel (demo)</h2>
            <p>Use Vercel ENV var ADMIN_PASSWORD and move auth server-side in production.</p>
          </div>
        )}
      </main>

      {showCheckout && checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={()=>{ setShowCheckout(false); setCheckoutPlan(null); }}
          onCreateOrder={async ({name,email})=>{
            try{
              // try server-side create order; if fails fallback to local
              const data = await createOrderServerSide({ planId: checkoutPlan.id, name, email });
              alert('Order created on server: ' + (data.order_id || JSON.stringify(data)));
            }catch(e){
              const o = createOrderLocal({ planId: checkoutPlan.id, name, email });
              alert('Demo order created locally: ' + o.id);
            } finally {
              setShowCheckout(false); setCheckoutPlan(null);
            }
          }}
        />
      )}
    </div>
  );
}

function CheckoutModal({ plan, onClose, onCreateOrder }){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:420,background:'#0b0b0b',padding:16,borderRadius:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontWeight:800}}>Checkout — {plan.title}</div>
          <button onClick={onClose}>X</button>
        </div>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,color:'#aaa'}}>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:8,marginTop:6,borderRadius:8,background:'#111',border:'1px solid #222',color:'#fff'}} />
        </div>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,color:'#aaa'}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:8,marginTop:6,borderRadius:8,background:'#111',border:'1px solid #222',color:'#fff'}} />
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
          <div>
            <div style={{fontSize:12,color:'#aaa'}}>Amount</div>
            <div style={{fontWeight:800}}>₹{plan.price}</div>
          </div>
          <div>
            <button disabled={!name||!email||loading} onClick={async ()=>{
              setLoading(true);
              try{ await onCreateOrder({ name, email }); }catch(e){ alert('Error: '+e.message); }finally{ setLoading(false); }
            }} style={{background:'#ff007a',color:'#000',padding:'10px 14px',borderRadius:8}}>Pay with Cashfree</button>
          </div>
        </div>
        <div style={{fontSize:12,color:'#888',marginTop:10}}>Demo: orders saved in localStorage. Configure /api/create-order on Vercel for real payments.</div>
      </div>
    </div>
  );
}

function CustomerDashboard({ orders }){
  const [email, setEmail] = useState('');
  const myOrders = email ? orders.filter(o=>o.email?.toLowerCase()===email.toLowerCase()) : [];

  return (
    <div>
      <h2>Customer Dashboard</h2>
      <div style={{marginTop:8,marginBottom:12}}>
        <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8,borderRadius:8,background:'#111',border:'1px solid #222',color:'#fff'}} />
      </div>
      {myOrders.length===0 ? <div style={{color:'#aaa'}}>No orders found for this email.</div> : (
        <div style={{display:'grid',gap:8}}>
          {myOrders.map(o=>(
            <div key={o.id} style={{padding:12,background:'#0b0b0b',borderRadius:8}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div style={{fontWeight:700}}>{o.planTitle}</div><div>₹{o.price}</div></div>
              <div style={{fontSize:12,color:'#999'}}>Order: {o.id} • {new Date(o.createdAt).toLocaleString()} • {o.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
