import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Truck, DollarSign, TrendingUp, TrendingDown,
  CalendarCheck, AlertTriangle, CheckCircle, Filter
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getFromDate(period) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (period === 'today') return ymd(now);
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return ymd(d); }
  if (period === 'month') return `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
  if (period === '3m')    { const d = new Date(now); d.setMonth(d.getMonth()-3); return ymd(d); }
  if (period === '6m')    { const d = new Date(now); d.setMonth(d.getMonth()-6); return ymd(d); }
  if (period === 'year')  return `${now.getFullYear()}-01-01`;
  return null; // 'all' / 'custom'
}

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = d => d ? String(d).slice(0, 10) : '';

export default function Dashboard() {
  const { vehicles, rentals, expenses, drivers, attendance } = useApp();
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const txt = isTamil ? {
    today: 'இன்று',
    week: 'இந்த வாரம்',
    month: 'இந்த மாதம்',
    threeMonth: 'கடைசி 3 மாதம்',
    sixMonth: 'கடைசி 6 மாதம்',
    year: 'இந்த ஆண்டு',
    all: 'முழு காலம்',
    custom: 'தனிப்பயன்',
    vehicle: 'வாகனம்',
    allVehicles: 'அனைத்து வாகனங்கள்',
    reset: 'மீட்டமை',
    totalRevenue: 'மொத்த வருவாய்',
    totalExpenses: 'மொத்த செலவுகள்',
    netProfit: 'நிகர லாபம்',
    activeRentals: 'செயலில் உள்ள வாடகைகள்',
    entries: 'பதிவுகள்',
    totalBookings: 'மொத்த பதிவுகள்',
    profit: 'லாபம்',
    loss: 'நட்டம்',
    revVsExp: 'வருவாய் vs செலவுகள்',
    noData: 'தேர்ந்த காலத்தில் தரவு இல்லை',
    expByCategory: 'வகை வாரி செலவு',
    fleetStatus: 'படை நிலை',
    available: 'காலியாக',
    onRent: 'வாடகையில்',
    maintenance: 'பராமரிப்பு',
    recentRentals: 'சமீப வாடகைகள்',
    customer: 'வாடிக்கையாளர்',
    vehicleCol: 'வாகனம்',
    period: 'காலம்',
    amount: 'தொகை',
    status: 'நிலை',
    todayAttendance: 'இன்றைய வருகை',
    present: 'வந்தவர்',
  } : {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    threeMonth: 'Last 3 Months',
    sixMonth: 'Last 6 Months',
    year: 'This Year',
    all: 'All Time',
    custom: 'Custom',
    vehicle: 'Vehicle',
    allVehicles: 'All Vehicles',
    reset: 'Reset',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    activeRentals: 'Active Rentals',
    entries: 'entries',
    totalBookings: 'total bookings',
    profit: 'Profit',
    loss: 'Loss',
    revVsExp: 'Revenue vs Expenses',
    noData: 'No data for selected period',
    expByCategory: 'Expense by Category',
    fleetStatus: 'Fleet Status',
    available: 'Available',
    onRent: 'On Rent',
    maintenance: 'Maintenance',
    recentRentals: 'Recent Rentals',
    customer: 'Customer',
    vehicleCol: 'Vehicle',
    period: 'Period',
    amount: 'Amount',
    status: 'Status',
    todayAttendance: "Today's Attendance",
    present: 'Present',
  };

  const PERIODS = [
    { label: txt.today, value: 'today' },
    { label: txt.week, value: 'week' },
    { label: txt.month, value: 'month' },
    { label: txt.threeMonth, value: '3m' },
    { label: txt.sixMonth, value: '6m' },
    { label: txt.year, value: 'year' },
    { label: txt.all, value: 'all' },
    { label: txt.custom, value: 'custom' },
  ];

  const [period,      setPeriod]      = useState('month');
  const [selVehicle,  setSelVehicle]  = useState('all');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const fromDate = period === 'custom' ? customFrom : getFromDate(period);
  const toDate   = period === 'custom' ? customTo   : today;

  const inRange = (dateStr) => {
    const d = fmtDate(dateStr);
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  };

  const filteredRentals = useMemo(() => rentals.filter(r =>
    (selVehicle === 'all' || String(r.vehicleId) === String(selVehicle)) && inRange(r.startDate)
  ), [rentals, selVehicle, fromDate, toDate]);

  const filteredExpenses = useMemo(() => expenses.filter(e =>
    (selVehicle === 'all' || String(e.vehicleId) === String(selVehicle)) && inRange(e.expenseDate || e.date)
  ), [expenses, selVehicle, fromDate, toDate]);

  const totalRevenue  = filteredRentals.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalProfit   = totalRevenue - totalExpenses;
  const activeRentals = filteredRentals.filter(r => r.status === 'active').length;

  const availableVeh   = vehicles.filter(v => v.status === 'available').length;
  const onRentVeh      = vehicles.filter(v => v.status === 'on-rent').length;
  const maintenanceVeh = vehicles.filter(v => v.status === 'maintenance').length;

  const todayStr     = today;
  const todayPresent = attendance.filter(a => {
    const d = fmtDate(a.attDate || a.date);
    return d === todayStr && a.status === 'present';
  }).length;

  // Build monthly chart data from real filtered data
  const monthlyData = useMemo(() => {
    const map = {};
    filteredRentals.forEach(r => {
      const key = fmtDate(r.startDate).slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { revenue: 0, expenses: 0 };
      map[key].revenue += Number(r.totalAmount || 0);
    });
    filteredExpenses.forEach(e => {
      const key = fmtDate(e.expenseDate || e.date).slice(0, 7);
      if (!map[key]) map[key] = { revenue: 0, expenses: 0 };
      map[key].expenses += Number(e.amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [y, m] = key.split('-');
        return { month: MONTH_NAMES[Number(m) - 1] + ' ' + y.slice(2), ...val };
      });
  }, [filteredRentals, filteredExpenses]);

  const vehicleTypeDist = ['Lorry','JCB','Tractor','Car'].map((type, i) => ({
    name: type,
    value: vehicles.filter(v => v.type === type).length,
    color: COLORS[i]
  }));

  const expCategoryData = ['Fuel','Maintenance','Repair','Insurance'].map(cat => ({
    name: cat,
    amount: filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0)
  }));

  return (
    <div>
      {/* Filter Bar */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, marginBottom:20,
        padding:'14px 20px', background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
        boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
        <Filter size={17} color="#475569" style={{ flexShrink:0 }} />

        {/* Period quick buttons */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              style={{
                padding:'7px 16px', borderRadius:20, border:'1.5px solid',
                fontSize:'0.875rem', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
                borderColor: period === p.value ? '#2563eb' : '#cbd5e1',
                background:  period === p.value ? '#2563eb' : '#f8fafc',
                color:       period === p.value ? '#ffffff' : '#334155',
                boxShadow:   period === p.value ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="date" className="form-input" style={{ width:150, height:36 }}
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ color:'#94a3b8', fontSize:'0.9rem' }}>→</span>
            <input type="date" className="form-input" style={{ width:150, height:36 }}
              value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        {/* Vehicle dropdown */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.875rem', color:'#475569', fontWeight:600 }}>{txt.vehicle}:</span>
          <select className="form-input" style={{ width:190, height:36, fontSize:'0.875rem' }}
            value={selVehicle} onChange={e => setSelVehicle(e.target.value)}>
            <option value="all">{txt.allVehicles}</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Active filter summary */}
        {(period !== 'month' || selVehicle !== 'all') && (
          <button onClick={() => { setPeriod('month'); setSelVehicle('all'); setCustomFrom(''); setCustomTo(''); }}
            style={{ padding:'6px 14px', borderRadius:20, border:'1px solid #fca5a5',
              background:'#fff1f2', color:'#dc2626', fontSize:'0.875rem', fontWeight:600, cursor:'pointer' }}>
            ✕ {txt.reset}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <DollarSign size={22} color="#1e40af" />
          </div>
          <div className="stat-info">
            <h3>{fmt(totalRevenue)}</h3>
            <p>{txt.totalRevenue}</p>
            <div className="stat-trend trend-up" style={{ color:'#64748b' }}>
              {PERIODS.find(p=>p.value===period)?.label}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <TrendingDown size={22} color="#dc2626" />
          </div>
          <div className="stat-info">
            <h3>{fmt(totalExpenses)}</h3>
            <p>{txt.totalExpenses}</p>
            <div className="stat-trend trend-down" style={{ color:'#64748b' }}>
              {filteredExpenses.length} {txt.entries}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <TrendingUp size={22} color="#059669" />
          </div>
          <div className="stat-info">
            <h3>{fmt(totalProfit)}</h3>
            <p>{txt.netProfit}</p>
            <div className={`stat-trend ${totalProfit >= 0 ? 'trend-up' : 'trend-down'}`} style={{ color:'#64748b' }}>
              {totalProfit >= 0 ? txt.profit : txt.loss}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <CalendarCheck size={22} color="#d97706" />
          </div>
          <div className="stat-info">
            <h3>{activeRentals}</h3>
            <p>{txt.activeRentals}</p>
            <div className="stat-trend trend-up" style={{ color:'#64748b' }}>
              {filteredRentals.length} {txt.totalBookings}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header">
            <span className="section-title">{txt.revVsExp} — {PERIODS.find(p=>p.value===period)?.label}</span>
          </div>
          {monthlyData.length === 0
            ? <div className="empty-state" style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center' }}>{txt.noData}</div>
            : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => '₹' + (v/1000) + 'k'} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => '₹' + v.toLocaleString('en-IN')} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" name="Revenue" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" name="Expenses" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="section-header">
            <span className="section-title">{txt.expByCategory}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => '₹' + (v/1000) + 'k'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => '₹' + v.toLocaleString('en-IN')} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[6,6,0,0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-3">
        {/* Vehicle Status */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">{txt.fleetStatus}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            <FleetStatusRow icon="🟢" label={txt.available} count={availableVeh} color="#10b981" />
            <FleetStatusRow icon="🔵" label={txt.onRent} count={onRentVeh} color="#3b82f6" />
            <FleetStatusRow icon="🔴" label={txt.maintenance} count={maintenanceVeh} color="#ef4444" />
          </div>
          <div style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={vehicleTypeDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {vehicleTypeDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: '0.78rem' }}>{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Rentals */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="section-header">
            <span className="section-title">{txt.recentRentals}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>{txt.customer}</th>
                <th>{txt.vehicleCol}</th>
                <th>{txt.period}</th>
                <th>{txt.amount}</th>
                <th>{txt.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.slice(0, 5).map(r => (
                <tr key={r.id}>
                  <td><strong>{r.customer}</strong><br/><span style={{ fontSize:'0.75rem', color:'#64748b' }}>{r.phone}</span></td>
                  <td>{r.vehicleName}</td>
                  <td style={{ fontSize: '0.8rem' }}>{String(r.startDate).slice(0,10)} → {String(r.endDate).slice(0,10)}<br/>
                    <span style={{ color:'#64748b' }}>{r.rateType === 'hourly' ? `${r.hours} hrs` : `${r.days} days`}</span></td>
                  <td><strong>{fmt(r.totalAmount)}</strong><br/><span style={{ fontSize:'0.75rem', color:'#ef4444' }}>Bal: {fmt(r.balance)}</span></td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-info' : r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Attendance Quick View */}
          <div style={{ marginTop: 20 }}>
            <div className="section-header">
              <span className="section-title">{txt.todayAttendance}</span>
              <span style={{ fontSize:'0.8rem', color:'#64748b' }}>{todayPresent}/{drivers.length} {txt.present}</span>
            </div>
            <div style={{ display:'flex', gap: 10, flexWrap:'wrap' }}>
              {drivers.map(d => {
                const att = attendance.find(a => a.driverId === d.id && fmtDate(a.attDate || a.date) === todayStr);
                const isPresent = att?.status === 'present';
                return (
                  <div key={d.id} style={{
                    display:'flex', alignItems:'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: isPresent ? '#d1fae5' : '#fee2e2',
                    border: `1px solid ${isPresent ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    {isPresent ? <CheckCircle size={14} color="#059669" /> : <AlertTriangle size={14} color="#dc2626" />}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: isPresent ? '#065f46' : '#991b1b' }}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetStatusRow({ label, count, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: '0.875rem', color: '#374151' }}>{label}</span>
      </div>
      <span style={{ fontWeight: 700, color, fontSize: '1rem' }}>{count}</span>
    </div>
  );
}
