import React, { useState } from 'react';

export default function AdminPanel({ authed, onLogin, orders = [], plans = [], addPlan = ()=>{}, removePlan = ()=>{}, markPaid = ()=>{}, refundOrder = ()=>{} }) {
  const [password, setPassword] = useState('');
  const [newPlan, setNewPlan] = useState({ title:'', cpu:'', ram:'', disk:'', price:0 });

  if (!authed) {
    return (
      <div style={{ maxWidth:420, padding:20, background:'#071018', borderRadius:12, color:'#e6eef6' }}>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Admin Login</h2>
        <label style={{ fontSize:13, color:'#9fb3c8' }}>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter admin password" style={{ width:'100%', padding:10, marginTop:8, marginBottom:12 }}/>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ const ok = onLogin(password); if(!ok) alert('Wrong password'); }} style={{ padding:'10px 14px', background:'#ff007a' }}>Login</button>
          <button onClick={()=>setPassword('')} style={{ padding:'10px 14px' }}>Clear</button>
        </div>
        <p style={{ fontSize:12, color:'#7a99ab', marginTop:10 }}>Demo password: <strong>admin123</strong>. Use Vercel env <code>ADMIN_PASSWORD</code> for safer auth.</p>
      </div>
    );
  }

  return (
    <div style={{ color:'#e6eef6' }}>
      <h2 style={{ fontSize:26, fontWeight:900 }}>Admin Panel</h2>
      <section style={{ marginTop:12 }}>
        <h3>Add Plan</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, maxWidth:900 }}>
          <input placeholder="Title" value={newPlan.title} onChange={e=>setNewPlan(p=>({...p,title:e.target.value}))} />
          <input placeholder="CPU" value={newPlan.cpu} onChange={e=>setNewPlan(p=>({...p,cpu:e.target.value}))} />
          <input placeholder="RAM" value={newPlan.ram} onChange={e=>setNewPlan(p=>({...p,ram:e.target.value}))} />
          <input placeholder="Disk" value={newPlan.disk} onChange={e=>setNewPlan(p=>setNewPlan(p=>({...p,disk:e.target.value}))) } />
          <input placeholder="Price (₹)" type="number" value={newPlan.price} onChange={e=>setNewPlan(p=>({...p,price:Number(e.target.value)}))} />
        </div>
        <div style={{ marginTop:8 }}>
          <button onClick={()=>{ if(!newPlan.title) return alert('Enter title'); addPlan(newPlan); setNewPlan({ title:'', cpu:'', ram:'', disk:'', price:0 }); }} style={{ padding:'8px 12px', background:'#17c964' }}>Add Plan</button>
        </div>
      </section>

      <section style={{ marginTop:16 }}>
        <h3>Plans</h3>
        <div>
          {plans.length===0 ? <div>No plans yet.</div> : plans.map(p=>(
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:8, background:'#021622', marginTop:8 }}>
              <div><strong>{p.title}</strong> — ₹{p.price}/mo<br/><small>{p.cpu} • {p.ram} • {p.disk}</small></div>
              <div>
                <button onClick={()=>removePlan(p.id)} style={{ marginLeft:8 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop:16 }}>
        <h3>Orders</h3>
        <div>
          {orders.length===0 ? <div>No orders</div> : orders.map(o=>(
            <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:8, background:'#021622', marginTop:8 }}>
              <div><strong>{o.planTitle}</strong> • ₹{o.price} • <small>{o.email}</small></div>
              <div>
                <small style={{ marginRight:8 }}>{o.status}</small>
                {o.status !== 'paid' && <button onClick={()=>markPaid(o.id)}>Mark Paid</button>}
                <button onClick={()=>refundOrder(o.id)} style={{ marginLeft:8 }}>Refund</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
