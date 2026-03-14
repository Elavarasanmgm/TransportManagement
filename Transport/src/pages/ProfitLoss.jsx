import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6'];

export default function ProfitLoss() {
  const { vehicles, rentals, expenses } = useApp();
  const [view, setView] = useState('overall'); // overall | by-vehicle

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  const totalRevenue  = rentals.reduce((s,r) => s + r.totalAmount, 0);
  const totalExpenses = expenses.reduce((s,e) => s + e.amount, 0);
  const grossProfit   = totalRevenue - totalExpenses;
  const profitMargin  = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Per vehicle P&L
  const vehiclePL = vehicles.map(v => {
    const rev = rentals.filter(r => r.vehicleId === v.id).reduce((s,r) => s + r.totalAmount, 0);
    const exp = expenses.filter(e => e.vehicleId === v.id).reduce((s,e) => s + e.amount, 0);
    const profit = rev - exp;
    return { ...v, revenue: rev, expenses: exp, profit, margin: rev > 0 ? ((profit/rev)*100).toFixed(1) : 0 };
  });

  const barData = vehiclePL.map(v => ({
    name: v.type,
    Revenue: v.revenue,
    Expenses: v.expenses,
    Profit: v.profit,
  }));

  const pieData = vehiclePL.filter(v => v.revenue > 0).map((v, i) => ({
    name: v.type,
    value: v.revenue,
    color: COLORS[i % COLORS.length],
  }));

  const monthlyPL = [
    { month:'Oct', revenue:42000, expenses:18000, profit:24000 },
    { month:'Nov', revenue:55000, expenses:22000, profit:33000 },
    { month:'Dec', revenue:48000, expenses:25000, profit:23000 },
    { month:'Jan', revenue:61000, expenses:19000, profit:42000 },
    { month:'Feb', revenue:58000, expenses:21000, profit:37000 },
    { month:'Mar', revenue:46500, expenses:19000, profit:27500 },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Profit & Loss</div>
          <div className="page-subtitle">Financial overview of your fleet</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label:'Total Revenue', value: fmt(totalRevenue), bg:'#dbeafe', color:'#1e40af', icon:'💰' },
          { label:'Total Expenses', value: fmt(totalExpenses), bg:'#fee2e2', color:'#dc2626', icon:'📉' },
          { label:'Net Profit', value: fmt(grossProfit), bg: grossProfit>=0?'#d1fae5':'#fee2e2', color: grossProfit>=0?'#059669':'#dc2626', icon: grossProfit>=0?'📈':'📉' },
          { label:'Profit Margin', value: `${profitMargin}%`, bg:'#fef3c7', color:'#d97706', icon:'🎯' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize:'1.4rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <h3 style={{ color: s.color, fontSize: s.value.length > 9 ? '1.1rem':'1.7rem' }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header">
            <span className="section-title">Monthly Profit Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyPL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:12 }} />
              <YAxis tickFormatter={v => '₹'+(v/1000)+'k'} tick={{ fontSize:11 }} />
              <Tooltip formatter={v => '₹'+v.toLocaleString('en-IN')} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#f87171" radius={[4,4,0,0]} name="Expenses" />
              <Bar dataKey="profit" fill="#10b981" radius={[4,4,0,0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-header">
            <span className="section-title">Revenue Share by Vehicle</span>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend formatter={v => <span style={{ fontSize:'0.8rem' }}>{v}</span>} />
                <Tooltip formatter={v => '₹'+v.toLocaleString('en-IN')} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No rental data available.</div>
          )}
        </div>
      </div>

      {/* Per Vehicle P&L table */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">Vehicle-wise Profit & Loss</span>
        </div>
        <div className="table-container" style={{ border:'none' }}>
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Gross Profit</th>
                <th>Margin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehiclePL.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:'1.4rem' }}>{v.emoji}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{v.regNo}</div>
                        <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{v.model}</div>
                      </div>
                    </div>
                  </td>
                  <td>{v.type}</td>
                  <td style={{ color:'#1e40af', fontWeight:600 }}>{fmt(v.revenue)}</td>
                  <td style={{ color:'#dc2626', fontWeight:600 }}>{fmt(v.expenses)}</td>
                  <td style={{ color: v.profit >= 0 ? '#059669' : '#dc2626', fontWeight:700 }}>{fmt(v.profit)}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                        <div style={{ width:`${Math.max(0,Math.min(100,v.margin))}%`, height:'100%', background: v.profit>=0?'#10b981':'#ef4444', borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:'0.8rem', fontWeight:600, color: v.profit>=0?'#059669':'#dc2626' }}>{v.margin}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${v.profit>=0?'badge-success':'badge-danger'}`}>
                      {v.profit>=0 ? 'Profit' : 'Loss'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ padding:'12px 16px', fontWeight:700, background:'#f8fafc' }}>Total</td>
                <td style={{ padding:'12px 16px', fontWeight:700, color:'#1e40af', background:'#f8fafc' }}>{fmt(totalRevenue)}</td>
                <td style={{ padding:'12px 16px', fontWeight:700, color:'#dc2626', background:'#f8fafc' }}>{fmt(totalExpenses)}</td>
                <td style={{ padding:'12px 16px', fontWeight:700, color: grossProfit>=0?'#059669':'#dc2626', background:'#f8fafc' }}>{fmt(grossProfit)}</td>
                <td style={{ padding:'12px 16px', fontWeight:700, background:'#f8fafc' }}>{profitMargin}%</td>
                <td style={{ background:'#f8fafc' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
