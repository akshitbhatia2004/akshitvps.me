import React, { useState } from 'react';

export default function AdminPanel({ authed, onLogin, orders = [], plans = [], addPlan = ()=>{}, removePlan = ()=>{}, markPaid = ()=>{}, refundOrder = ()=>{} }) {
  const [password, setPassword] = useState('');
  if (!authed) {
    return (
      <div style={{ maxWidth:420, padding:20, background:'#071018', borderRadius:12, color:'#e6eef6' }}>
        <h2>Admin Login</h2>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" style={{ width:'100%', padding:10, marginTop:8 }} />
        <div style={{ marginTop:8 }}>
          <button onClick={()=>{ const ok = onLogin(password); if(!ok) alert('Wrong password'); }}>Login</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h2>Admin Panel</h2>
      <div>Orders: {orders.length}</div>
      <div>Plans: {plans.length}</div>
    </div>
  );
}
