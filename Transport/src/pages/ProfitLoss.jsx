import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6'];

export default function ProfitLoss() {
  const { vehicles, rentals, expenses } = useApp();
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const txt = isTamil ? {
    title: 'லாபம் & நட்டம்',
    subtitle: 'உங்கள் படையின் நிதி பார்வை',
    totalRevenue: 'மொத்த வருவாய்',
    totalExpenses: 'மொத்த செலவுகள்',
    netProfit: 'நிகர லாபம்',
    profitMargin: 'லாப விகிதம்',
    monthlyTrend: 'மாத லாப போக்கு',
    revenueShare: 'வாகன வாரி வருவாய் பங்கு',
    noData: 'வாடகை தரவு இல்லை.',
    tableTitle: 'வாகன வாரி லாபம் & நட்டம்',
    vehicle: 'வாகனம்',
    type: 'வகை',
    revenue: 'வருவாய்',
    expenses: 'செலவுகள்',
    grossProfit: 'மொத்த லாபம்',
    margin: 'விகிதம்',
    status: 'நிலை',
    total: 'மொத்தம்',
    profit: 'லாபம்',
    loss: 'நட்டம்',
  } : {
    title: 'Profit & Loss',
    subtitle: 'Financial overview of your fleet',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    profitMargin: 'Profit Margin',
    monthlyTrend: 'Monthly Profit Trend',
    revenueShare: 'Revenue Share by Vehicle',
    noData: 'No rental data available.',
    tableTitle: 'Vehicle-wise Profit & Loss',
    vehicle: 'Vehicle',
    type: 'Type',
    revenue: 'Revenue',
    expenses: 'Expenses',
    grossProfit: 'Gross Profit',
    margin: 'Margin',
    status: 'Status',
    total: 'Total',
    profit: 'Profit',
    loss: 'Loss',
  };
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

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyPL = useMemo(() => {
    const map = {};
    rentals.forEach(r => {
      const d = r.startDate ? new Date(r.startDate) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: MONTHS_SHORT[d.getMonth()], revenue: 0, expenses: 0, profit: 0, _key: key };
      map[key].revenue += Number(r.totalAmount) || 0;
    });
    expenses.forEach(e => {
      const raw = e.expenseDate || e.date;
      const d   = raw ? new Date(raw) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: MONTHS_SHORT[d.getMonth()], revenue: 0, expenses: 0, profit: 0, _key: key };
      map[key].expenses += Number(e.amount) || 0;
    });
    return Object.values(map)
      .sort((a, b) => a._key.localeCompare(b._key))
      .slice(-6)
      .map(({ month, revenue, expenses, profit: _ }) => ({ month, revenue, expenses, profit: revenue - expenses }));
  }, [rentals, expenses]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{txt.title}</div>
          <div className="page-subtitle">{txt.subtitle}</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label:txt.totalRevenue, value: fmt(totalRevenue), bg:'#dbeafe', color:'#1e40af', icon:'💰' },
          { label:txt.totalExpenses, value: fmt(totalExpenses), bg:'#fee2e2', color:'#dc2626', icon:'📉' },
          { label:txt.netProfit, value: fmt(grossProfit), bg: grossProfit>=0?'#d1fae5':'#fee2e2', color: grossProfit>=0?'#059669':'#dc2626', icon: grossProfit>=0?'📈':'📉' },
          { label:txt.profitMargin, value: `${profitMargin}%`, bg:'#fef3c7', color:'#d97706', icon:'🎯' },
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
            <span className="section-title">{txt.monthlyTrend}</span>
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
            <span className="section-title">{txt.revenueShare}</span>
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
            <div className="empty-state">{txt.noData}</div>
          )}
        </div>
      </div>

      {/* Per Vehicle P&L table */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">{txt.tableTitle}</span>
        </div>
        <div className="table-container" style={{ border:'none' }}>
          <table>
            <thead>
              <tr>
                <th>{txt.vehicle}</th>
                <th>{txt.type}</th>
                <th>{txt.revenue}</th>
                <th>{txt.expenses}</th>
                <th>{txt.grossProfit}</th>
                <th>{txt.margin}</th>
                <th>{txt.status}</th>
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
                      {v.profit>=0 ? txt.profit : txt.loss}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ padding:'12px 16px', fontWeight:700, background:'#f8fafc' }}>{txt.total}</td>
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
