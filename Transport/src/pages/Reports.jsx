import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FileSpreadsheet, FileText, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? String(d).slice(0, 10) : '';
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
  );
}

function ExportBar({ onExcel, onPDF }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button onClick={onExcel} className="btn btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
        <FileSpreadsheet size={14} /> Export Excel
      </button>
      <button onClick={onPDF} className="btn btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
        <FileText size={14} /> Export PDF
      </button>
    </div>
  );
}

function exportExcel(data, columns, filename, sheetName = 'Report') {
  const rows = data.map(row => {
    const r = {};
    columns.forEach(c => { r[c.header] = row[c.key]; });
    return r;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename + '.xlsx');
}

function exportPDF(data, columns, filename, title) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => row[c.key] ?? '')),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(filename + '.pdf');
}

// Customer report PDF — each customer gets its own page section
// with name badge top-right, phone below, then a clean detail table
function exportCustomerPDF(groups, filename, title) {
  const detailCols = [
    { key:'Vehicle',       header:'Vehicle' },
    { key:'Start Date',    header:'Start Date' },
    { key:'End Date',      header:'End Date' },
    { key:'Rate Type',     header:'Rate Type' },
    { key:'Days/Hours',    header:'Days / Hrs' },
    { key:'Rate (\u20b9)',     header:'Rate (\u20b9)' },
    { key:'Gross (\u20b9)',    header:'Gross (\u20b9)' },
    { key:'Discount (\u20b9)', header:'Discount (\u20b9)' },
    { key:'Advance (\u20b9)',  header:'Advance (\u20b9)' },
    { key:'Balance (\u20b9)',  header:'Balance (\u20b9)' },
    { key:'Status',        header:'Status' },
  ];

  const doc = new jsPDF({ orientation: 'landscape' });
  const pw  = doc.internal.pageSize.width;   // ≈297 for A4 landscape

  groups.forEach((g, gi) => {
    if (gi > 0) doc.addPage();

    // ── Left: report title + generated date ───────────────────────
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 16);

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);

    // ── Right: customer name badge ─────────────────────────────────
    const badgeW = 95;
    const badgeX = pw - 14 - badgeW;
    doc.setFillColor(219, 234, 254);          // light blue
    doc.roundedRect(badgeX, 8, badgeW, 13, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 64, 175);            // dark blue
    doc.text(g.label, badgeX + badgeW / 2, 17, { align: 'center' });

    // Phone label + value below badge
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Phone number', badgeX + badgeW / 2, 27, { align: 'center' });
    doc.setTextColor(30, 41, 59);
    doc.text(g.subLabel || '\u2014', badgeX + badgeW / 2, 32, { align: 'center' });

    // ── Separator line ─────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 37, pw - 14, 37);

    // ── Summary stats ──────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const stats = [
      { label: 'Bookings', value: g.totalBookings },
      { label: 'Total',    value: g.totalAmt },
      { label: 'Advance',  value: g.totalAdv },
      { label: 'Balance',  value: g.totalBal },
    ];
    let sx = 14;
    stats.forEach(s => {
      doc.setTextColor(100, 116, 139);
      doc.text(s.label + ': ', sx, 43);
      const lw = doc.getTextWidth(s.label + ': ');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(String(s.value), sx + lw, 43);
      sx += lw + doc.getTextWidth(String(s.value)) + 14;
      doc.setFont(undefined, 'normal');
    });

    // ── Detail table ───────────────────────────────────────────────
    autoTable(doc, {
      startY: 47,
      head: [detailCols.map(c => c.header)],
      body: g.rows.map(row => detailCols.map(c => row[c.key] ?? '')),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  });

  doc.save(filename + '.pdf');
}

// Groups: [{ label, subLabel?, summary?, rows }]
// columns: detail cols only (group identifier NOT included)
function exportGroupedPDF(groups, columns, filename, title) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);

  let y = 30;
  groups.forEach((group, gi) => {
    // Group header band
    const pageH = doc.internal.pageSize.height;
    if (y > pageH - 40) { doc.addPage(); y = 14; }

    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14, y, doc.internal.pageSize.width - 28, 9, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 64, 175);
    const labelText = group.subLabel ? `${group.label}   |   ${group.subLabel}` : group.label;
    doc.text(labelText, 18, y + 6.2);
    if (group.summary) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 116, 139);
      const sw = doc.getTextWidth(group.summary);
      doc.text(group.summary, doc.internal.pageSize.width - 14 - sw, y + 6.2);
    }
    doc.setTextColor(0, 0, 0);
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [columns.map(c => c.header)],
      body: group.rows.map(row => columns.map(c => row[c.key] ?? '')),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  });
  doc.save(filename + '.pdf');
}

// ─────────────────────────────────────────────
// 1. Customer-wise Transaction Report
// ─────────────────────────────────────────────
function CustomerReport({ rentals, customers }) {
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [status, setStatus]     = useState('all');

  const filtered = useMemo(() => {
    return rentals.filter(r => {
      const d = fmtDate(r.startDate);
      return (selectedCustomer === 'all' || r.customer === selectedCustomer)
        && (status === 'all' || r.status === status)
        && (!fromDate || d >= fromDate)
        && (!toDate   || d <= toDate);
    });
  }, [rentals, selectedCustomer, fromDate, toDate, status]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.customer]) map[r.customer] = { customer: r.customer, phone: r.phone, rentals: [], total: 0, advance: 0, balance: 0 };
      map[r.customer].rentals.push(r);
      map[r.customer].total   += Number(r.totalAmount || 0);
      map[r.customer].advance += Number(r.advancePaid || 0);
      map[r.customer].balance += Number(r.balance || 0);
    });
    return Object.values(map);
  }, [filtered]);

  const flatRows = useMemo(() => filtered.map(r => ({
    Customer:    r.customer,
    Phone:       r.phone,
    Vehicle:     r.vehicleName,
    'Start Date': fmtDate(r.startDate),
    'End Date':   fmtDate(r.endDate),
    'Rate Type':  r.rateType || 'daily',
    'Days/Hours': r.rateType === 'hourly' ? r.hours : r.days,
    'Rate (₹)':  r.rateType === 'hourly' ? r.hourlyRate : r.dailyRate,
    'Gross (₹)': r.totalAmount,
    'Discount (₹)': r.discount || 0,
    'Advance (₹)':  r.advancePaid,
    'Balance (₹)':  r.balance,
    Status:      r.status,
    Purpose:     r.purpose || '',
  })), [filtered]);

  const cols = [
    { key:'Customer', header:'Customer' },
    { key:'Phone', header:'Phone' },
    { key:'Vehicle', header:'Vehicle' },
    { key:'Start Date', header:'Start Date' },
    { key:'End Date', header:'End Date' },
    { key:'Rate Type', header:'Rate Type' },
    { key:'Days/Hours', header:'Days / Hrs' },
    { key:'Rate (₹)', header:'Rate (₹)' },
    { key:'Gross (₹)', header:'Gross (₹)' },
    { key:'Discount (₹)', header:'Discount (₹)' },
    { key:'Advance (₹)', header:'Advance (₹)' },
    { key:'Balance (₹)', header:'Balance (₹)' },
    { key:'Status', header:'Status' },
  ];

  const customerNames = [...new Set(rentals.map(r => r.customer))].sort();

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <SectionHeader title="1. Customer-wise Transaction Details" subtitle="All rental transactions grouped by customer" />

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16, padding:'14px 16px', background:'#f8fafc', borderRadius:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Customer</label>
          <select className="form-input" style={{ width:180 }} value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
            <option value="all">All Customers</option>
            {customerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>From Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>To Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Status</label>
          <select className="form-input" style={{ width:140 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCustomer('all'); setFromDate(''); setToDate(''); setStatus('all'); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:16 }}>
        {[
          { label:'Total Bookings', value: filtered.length, color:'#1e40af', bg:'#dbeafe' },
          { label:'Total Amount', value: fmt(filtered.reduce((s,r)=>s+Number(r.totalAmount||0),0)), color:'#059669', bg:'#d1fae5' },
          { label:'Total Advance', value: fmt(filtered.reduce((s,r)=>s+Number(r.advancePaid||0),0)), color:'#d97706', bg:'#fef3c7' },
          { label:'Total Balance', value: fmt(filtered.reduce((s,r)=>s+Number(r.balance||0),0)), color:'#dc2626', bg:'#fee2e2' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'10px 18px', borderRadius:10, background:s.bg, minWidth:140 }}>
            <div style={{ fontSize:'0.72rem', color:s.color, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:'1.1rem', fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <ExportBar
        onExcel={() => exportExcel(flatRows, cols, 'Customer_Transactions')}
        onPDF={() => {
          const pdfGroups = grouped.map(g => ({
            label:        g.customer,
            subLabel:     g.phone,
            totalBookings: g.rentals.length,
            totalAmt:     fmt(g.total),
            totalAdv:     fmt(g.advance),
            totalBal:     fmt(g.balance),
            rows: g.rentals.map(r => ({
              'Vehicle':       r.vehicleName,
              'Start Date':    fmtDate(r.startDate),
              'End Date':      fmtDate(r.endDate),
              'Rate Type':     r.rateType || 'daily',
              'Days/Hours':    r.rateType === 'hourly' ? r.hours : r.days,
              'Rate (\u20b9)':     r.rateType === 'hourly' ? r.hourlyRate : r.dailyRate,
              'Gross (\u20b9)':    r.totalAmount,
              'Discount (\u20b9)': r.discount || 0,
              'Advance (\u20b9)':  r.advancePaid,
              'Balance (\u20b9)':  r.balance,
              'Status':        r.status,
            })),
          }));
          exportCustomerPDF(pdfGroups, 'Customer_Transactions', 'Customer-wise Transaction Details');
        }}
      />

      {/* Summary by customer */}
      {grouped.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {grouped.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 16, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', background:'#eff6ff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontWeight:700, color:'#1e40af' }}>{g.customer}</span>
                  <span style={{ fontSize:'0.78rem', color:'#64748b', marginLeft:10 }}>{g.phone}</span>
                </div>
                <div style={{ display:'flex', gap:20, fontSize:'0.82rem' }}>
                  <span><strong>{g.rentals.length}</strong> bookings</span>
                  <span style={{ color:'#059669' }}>Total: <strong>{fmt(g.total)}</strong></span>
                  <span style={{ color:'#d97706' }}>Advance: <strong>{fmt(g.advance)}</strong></span>
                  <span style={{ color:'#dc2626' }}>Balance: <strong>{fmt(g.balance)}</strong></span>
                </div>
              </div>
              <div className="table-container" style={{ border:'none', margin:0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Vehicle</th><th>Period</th><th>Rate</th>
                      <th>Gross</th><th>Discount</th><th>Advance</th><th>Balance</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rentals.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color:'#94a3b8', fontSize:'0.78rem' }}>{i+1}</td>
                        <td style={{ fontSize:'0.83rem' }}>{r.vehicleName}</td>
                        <td style={{ fontSize:'0.78rem' }}>
                          {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                          <div style={{ color:'#94a3b8' }}>{r.rateType==='hourly' ? `${r.hours}h @ ${fmt(r.hourlyRate)}/hr` : `${r.days}d @ ${fmt(r.dailyRate)}/d`}</div>
                        </td>
                        <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{r.rateType === 'hourly' ? 'Hourly' : 'Daily'}</td>
                        <td><strong>{fmt(r.totalAmount)}</strong></td>
                        <td style={{ color:'#d97706' }}>{fmt(r.discount||0)}</td>
                        <td style={{ color:'#059669' }}>{fmt(r.advancePaid)}</td>
                        <td style={{ color: r.balance>0?'#dc2626':'#059669', fontWeight:600 }}>{fmt(r.balance)}</td>
                        <td><span className={`badge ${r.status==='active'?'badge-info':r.status==='completed'?'badge-success':'badge-danger'}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {grouped.length === 0 && <div className="empty-state">No transactions found for selected filters.</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. Attendance Monthly Report
// ─────────────────────────────────────────────
function AttendanceReport({ attendance, drivers }) {
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selDriver, setSelDriver] = useState('all');

  const yearStr  = selYear.toString();
  const monthStr = String(selMonth).padStart(2, '0');
  const prefix   = `${yearStr}-${monthStr}`;

  const filtered = useMemo(() => {
    return attendance.filter(a => {
      const d = (a.attDate || a.date || '');
      return d.startsWith(prefix) && (selDriver === 'all' || String(a.driverId) === String(selDriver));
    });
  }, [attendance, prefix, selDriver]);

  const summary = useMemo(() => {
    return drivers.map(d => {
      const recs = filtered.filter(a => a.driverId === d.id);
      const present  = recs.filter(a => a.status === 'present').length;
      const absent   = recs.filter(a => a.status === 'absent').length;
      const halfday  = recs.filter(a => a.status === 'halfday').length;
      const leave    = recs.filter(a => a.status === 'leave').length;
      const overtime = recs.reduce((s, a) => s + Number(a.overtime || 0), 0);
      const workDays = present + halfday * 0.5;
      const earned   = (workDays / 26) * Number(d.salary || 0);
      return { ...d, present, absent, halfday, leave, overtime, workDays, earned: Math.round(earned) };
    }).filter(d => selDriver === 'all' || String(d.id) === String(selDriver));
  }, [drivers, filtered, selDriver]);

  const flatRows = useMemo(() => {
    return filtered.map(a => {
      const d = drivers.find(dr => dr.id === a.driverId);
      return {
        Driver:    a.driverName,
        Date:      fmtDate(a.attDate || a.date),
        Status:    a.status,
        'In Time': a.inTime || '',
        'Out Time': a.outTime || '',
        Overtime:  a.overtime || 0,
        Notes:     a.notes || '',
        Salary:    d?.salary || 0,
        Advance:   d?.advance || 0,
      };
    });
  }, [filtered, drivers]);

  const summaryRows = summary.map(d => ({
    Driver:     d.name,
    Phone:      d.phone,
    Present:    d.present,
    Absent:     d.absent,
    'Half Day': d.halfday,
    Leave:      d.leave,
    'Work Days': d.workDays,
    Overtime:   d.overtime,
    Salary:     d.salary || 0,
    Advance:    d.advance || 0,
    'Net Payable': (d.salary || 0) - (d.advance || 0),
  }));

  const detailCols = [
    { key:'Driver', header:'Driver' }, { key:'Date', header:'Date' }, { key:'Status', header:'Status' },
    { key:'In Time', header:'In' }, { key:'Out Time', header:'Out' }, { key:'Overtime', header:'OT (hrs)' },
    { key:'Salary', header:'Salary (₹)' }, { key:'Advance', header:'Advance (₹)' }, { key:'Notes', header:'Notes' },
  ];
  const sumCols = [
    { key:'Driver', header:'Driver' }, { key:'Phone', header:'Phone' },
    { key:'Present', header:'Present' }, { key:'Absent', header:'Absent' },
    { key:'Half Day', header:'Half Day' }, { key:'Leave', header:'Leave' },
    { key:'Work Days', header:'Work Days' }, { key:'Overtime', header:'OT (hrs)' },
    { key:'Salary', header:'Salary (₹)' }, { key:'Advance', header:'Advance (₹)' },
    { key:'Net Payable', header:'Net Payable (₹)' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <SectionHeader title="2. Attendance Report — Monthly" subtitle="Monthly driver attendance with salary & advance details" />

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16, padding:'14px 16px', background:'#f8fafc', borderRadius:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Year</label>
          <select className="form-input" style={{ width:110 }} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Month</label>
          <select className="form-input" style={{ width:130 }} value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Driver</label>
          <select className="form-input" style={{ width:180 }} value={selDriver} onChange={e => setSelDriver(e.target.value)}>
            <option value="all">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Monthly summary cards per driver */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12, marginBottom:16 }}>
        {summary.map(d => (
          <div key={d.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', background:'#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, color:'#1e293b' }}>{d.name}</div>
                <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{d.phone}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.8rem', color:'#059669', fontWeight:600 }}>Salary: {fmt(d.salary)}</div>
                <div style={{ fontSize:'0.78rem', color:'#dc2626' }}>Advance: {fmt(d.advance)}</div>
                <div style={{ fontSize:'0.78rem', color:'#1e40af', fontWeight:700 }}>Net: {fmt((d.salary||0)-(d.advance||0))}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { label:'Present', value: d.present, color:'#059669', bg:'#d1fae5' },
                { label:'Absent',  value: d.absent,  color:'#dc2626', bg:'#fee2e2' },
                { label:'Half Day',value: d.halfday, color:'#d97706', bg:'#fef3c7' },
                { label:'Leave',   value: d.leave,   color:'#7c3aed', bg:'#f3e8ff' },
              ].map(s => (
                <div key={s.label} style={{ padding:'4px 10px', borderRadius:20, background:s.bg, fontSize:'0.75rem', fontWeight:600, color:s.color }}>
                  {s.label}: {s.value}
                </div>
              ))}
              {d.overtime > 0 && <div style={{ padding:'4px 10px', borderRadius:20, background:'#ecfdf5', fontSize:'0.75rem', fontWeight:600, color:'#059669' }}>OT: {d.overtime}h</div>}
            </div>
          </div>
        ))}
      </div>

      <ExportBar
        onExcel={() => {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows.map(r => { const o={}; sumCols.forEach(c=>o[c.header]=r[c.key]); return o; })), 'Summary');
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flatRows.map(r => { const o={}; detailCols.forEach(c=>o[c.header]=r[c.key]); return o; })), 'Details');
          XLSX.writeFile(wb, `Attendance_${yearStr}_${monthStr}.xlsx`);
        }}
        onPDF={() => exportPDF(summaryRows, sumCols, `Attendance_${yearStr}_${monthStr}`, `Attendance Report — ${months[selMonth-1]} ${selYear}`)}
      />

      {/* Summary table */}
      <div className="table-container" style={{ marginBottom: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Driver</th><th>Present</th><th>Absent</th><th>Half Day</th>
              <th>Leave</th><th>Work Days</th><th>OT (hrs)</th>
              <th>Salary (₹)</th><th>Advance (₹)</th><th>Net Payable (₹)</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ fontWeight:600 }}>{d.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{d.phone}</div>
                </td>
                <td style={{ color:'#059669', fontWeight:600 }}>{d.present}</td>
                <td style={{ color:'#dc2626', fontWeight:600 }}>{d.absent}</td>
                <td style={{ color:'#d97706', fontWeight:600 }}>{d.halfday}</td>
                <td style={{ color:'#7c3aed', fontWeight:600 }}>{d.leave}</td>
                <td style={{ fontWeight:600 }}>{d.workDays}</td>
                <td>{d.overtime || 0}</td>
                <td style={{ color:'#059669' }}>{fmt(d.salary)}</td>
                <td style={{ color:'#dc2626' }}>{fmt(d.advance)}</td>
                <td style={{ color:'#1e40af', fontWeight:700 }}>{fmt((d.salary||0)-(d.advance||0))}</td>
              </tr>
            ))}
            {summary.length === 0 && <tr><td colSpan={10} className="empty-state">No attendance records found.</td></tr>}
          </tbody>
          {summary.length > 0 && (
            <tfoot>
              <tr style={{ background:'#f1f5f9', fontWeight:700 }}>
                <td>Total</td>
                <td style={{ color:'#059669' }}>{summary.reduce((s,d)=>s+d.present,0)}</td>
                <td style={{ color:'#dc2626' }}>{summary.reduce((s,d)=>s+d.absent,0)}</td>
                <td style={{ color:'#d97706' }}>{summary.reduce((s,d)=>s+d.halfday,0)}</td>
                <td style={{ color:'#7c3aed' }}>{summary.reduce((s,d)=>s+d.leave,0)}</td>
                <td>{summary.reduce((s,d)=>s+d.workDays,0)}</td>
                <td>{summary.reduce((s,d)=>s+(d.overtime||0),0)}</td>
                <td style={{ color:'#059669' }}>{fmt(summary.reduce((s,d)=>s+(d.salary||0),0))}</td>
                <td style={{ color:'#dc2626' }}>{fmt(summary.reduce((s,d)=>s+(d.advance||0),0))}</td>
                <td style={{ color:'#1e40af' }}>{fmt(summary.reduce((s,d)=>s+(d.salary||0)-(d.advance||0),0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 3. Vehicle-wise Expenses Report
// ─────────────────────────────────────────────
function ExpensesReport({ expenses, vehicles }) {
  const [selVehicle, setSelVehicle] = useState('all');
  const [selCategory, setSelCategory] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  const categories = [...new Set(expenses.map(e => e.category))].sort();

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const d = fmtDate(e.date);
      return (selVehicle === 'all' || String(e.vehicleId) === String(selVehicle))
        && (selCategory === 'all' || e.category === selCategory)
        && (!fromDate || d >= fromDate)
        && (!toDate   || d <= toDate);
    });
  }, [expenses, selVehicle, selCategory, fromDate, toDate]);

  const byVehicle = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.vehicleId;
      if (!map[key]) map[key] = { vehicleName: e.vehicleName, expenses: [], total: 0 };
      map[key].expenses.push(e);
      map[key].total += Number(e.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const flatRows = filtered.map(e => ({
    Vehicle:    e.vehicleName,
    Category:   e.category,
    Amount:     e.amount,
    Date:       fmtDate(e.date),
    'Paid By':  e.paidBy || '',
    Description: e.description || '',
  }));

  const cols = [
    { key:'Vehicle', header:'Vehicle' }, { key:'Category', header:'Category' },
    { key:'Amount', header:'Amount (₹)' }, { key:'Date', header:'Date' },
    { key:'Paid By', header:'Paid By' }, { key:'Description', header:'Description' },
  ];

  const catTotals = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [filtered]);

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <SectionHeader title="3. Vehicle-wise Expenses Report" subtitle="All expenses broken down by vehicle and category" />

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16, padding:'14px 16px', background:'#f8fafc', borderRadius:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Vehicle</label>
          <select className="form-input" style={{ width:200 }} value={selVehicle} onChange={e => setSelVehicle(e.target.value)}>
            <option value="all">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Category</label>
          <select className="form-input" style={{ width:160 }} value={selCategory} onChange={e => setSelCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>From Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>To Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', alignItems:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelVehicle('all'); setSelCategory('all'); setFromDate(''); setToDate(''); }}>Clear</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        <div style={{ padding:'10px 18px', borderRadius:10, background:'#fee2e2', minWidth:160 }}>
          <div style={{ fontSize:'0.72rem', fontWeight:600, color:'#dc2626' }}>Total Expenses</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700, color:'#dc2626' }}>{fmt(filtered.reduce((s,e)=>s+Number(e.amount||0),0))}</div>
        </div>
        <div style={{ padding:'10px 18px', borderRadius:10, background:'#f3f4f6', minWidth:160 }}>
          <div style={{ fontSize:'0.72rem', fontWeight:600, color:'#6b7280' }}>Entries</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700, color:'#374151' }}>{filtered.length}</div>
        </div>
        {catTotals.map(([cat, total]) => (
          <div key={cat} style={{ padding:'10px 18px', borderRadius:10, background:'#fef3c7', minWidth:130 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:600, color:'#92400e' }}>{cat}</div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'#b45309' }}>{fmt(total)}</div>
          </div>
        ))}
      </div>

      <ExportBar
        onExcel={() => exportExcel(flatRows, cols, 'Vehicle_Expenses')}
        onPDF={() => {
          const detailCols = [
            { key:'Category',    header:'Category' },
            { key:'Amount (₹)',  header:'Amount (₹)' },
            { key:'Date',        header:'Date' },
            { key:'Paid By',     header:'Paid By' },
            { key:'Description', header:'Description' },
          ];
          const pdfGroups = byVehicle.map(v => ({
            label: v.vehicleName,
            summary: `${v.expenses.length} entries   Total: ${fmt(v.total)}`,
            rows: v.expenses.map(e => ({
              'Category':    e.category,
              'Amount (₹)':  e.amount,
              'Date':        fmtDate(e.date),
              'Paid By':     e.paidBy || '',
              'Description': e.description || '',
            })),
          }));
          exportGroupedPDF(pdfGroups, detailCols, 'Vehicle_Expenses', 'Vehicle-wise Expenses Report');
        }}
      />

      {byVehicle.map((v, vi) => (
        <div key={vi} style={{ marginBottom: 16, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'10px 16px', background:'#fef2f2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, color:'#dc2626' }}>🚛 {v.vehicleName}</span>
            <span style={{ fontWeight:700, color:'#dc2626' }}>Total: {fmt(v.total)}</span>
          </div>
          <div className="table-container" style={{ border:'none', margin:0 }}>
            <table>
              <thead><tr><th>Category</th><th>Amount</th><th>Date</th><th>Paid By</th><th>Description</th></tr></thead>
              <tbody>
                {v.expenses.map(e => (
                  <tr key={e.id}>
                    <td><span style={{ padding:'3px 10px', borderRadius:20, background:'#fee2e2', color:'#dc2626', fontSize:'0.78rem', fontWeight:600 }}>{e.category}</span></td>
                    <td style={{ fontWeight:600, color:'#dc2626' }}>{fmt(e.amount)}</td>
                    <td style={{ fontSize:'0.8rem' }}>{fmtDate(e.date)}</td>
                    <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{e.paidBy}</td>
                    <td style={{ fontSize:'0.8rem', color:'#64748b' }}>{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {byVehicle.length === 0 && <div className="empty-state">No expenses found.</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// 4. Profit & Loss Report
// ─────────────────────────────────────────────
function ProfitLossReport({ rentals, expenses, vehicles }) {
  const now = new Date();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [selVehicle, setSelVehicle] = useState('all');
  const [groupBy, setGroupBy]   = useState('vehicle'); // vehicle | month

  const filteredRentals = useMemo(() => rentals.filter(r => {
    const d = fmtDate(r.startDate);
    return (selVehicle === 'all' || String(r.vehicleId) === String(selVehicle))
      && (!fromDate || d >= fromDate)
      && (!toDate   || d <= toDate);
  }), [rentals, selVehicle, fromDate, toDate]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const d = fmtDate(e.date);
    return (selVehicle === 'all' || String(e.vehicleId) === String(selVehicle))
      && (!fromDate || d >= fromDate)
      && (!toDate   || d <= toDate);
  }), [expenses, selVehicle, fromDate, toDate]);

  const totalRev = filteredRentals.reduce((s,r) => s+Number(r.totalAmount||0), 0);
  const totalExp = filteredExpenses.reduce((s,e) => s+Number(e.amount||0), 0);
  const netProfit = totalRev - totalExp;
  const margin = totalRev > 0 ? ((netProfit/totalRev)*100).toFixed(1) : 0;

  const byVehicle = useMemo(() => vehicles.map(v => {
    const rev = filteredRentals.filter(r => r.vehicleId === v.id).reduce((s,r) => s+Number(r.totalAmount||0), 0);
    const exp = filteredExpenses.filter(e => e.vehicleId === v.id).reduce((s,e) => s+Number(e.amount||0), 0);
    return { name: v.name, type: v.type, revenue: rev, expenses: exp, profit: rev-exp, margin: rev>0?((rev-exp)/rev*100).toFixed(1):0 };
  }).filter(v => v.revenue > 0 || v.expenses > 0), [vehicles, filteredRentals, filteredExpenses]);

  const byMonth = useMemo(() => {
    const map = {};
    filteredRentals.forEach(r => {
      const key = fmtDate(r.startDate).slice(0,7);
      if (!map[key]) map[key] = { month: key, revenue: 0, expenses: 0 };
      map[key].revenue += Number(r.totalAmount||0);
    });
    filteredExpenses.forEach(e => {
      const key = fmtDate(e.date).slice(0,7);
      if (!map[key]) map[key] = { month: key, revenue: 0, expenses: 0 };
      map[key].expenses += Number(e.amount||0);
    });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, profit: m.revenue-m.expenses, margin: m.revenue>0?((m.revenue-m.expenses)/m.revenue*100).toFixed(1):0 }));
  }, [filteredRentals, filteredExpenses]);

  const tableData  = groupBy === 'vehicle' ? byVehicle : byMonth;
  const nameKey    = groupBy === 'vehicle' ? 'name' : 'month';
  const nameHeader = groupBy === 'vehicle' ? 'Vehicle' : 'Month';

  const flatRows = tableData.map(r => ({
    [nameHeader]: r[nameKey],
    'Revenue (₹)':  r.revenue,
    'Expenses (₹)': r.expenses,
    'Profit (₹)':   r.profit,
    'Margin %':     r.margin + '%',
  }));
  const cols = [
    { key: nameHeader, header: nameHeader },
    { key:'Revenue (₹)', header:'Revenue (₹)' },
    { key:'Expenses (₹)', header:'Expenses (₹)' },
    { key:'Profit (₹)', header:'Profit (₹)' },
    { key:'Margin %', header:'Margin %' },
  ];

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <SectionHeader title="4. Profit & Loss Report" subtitle="Revenue vs expenses with net profit by vehicle or month" />

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16, padding:'14px 16px', background:'#f8fafc', borderRadius:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Vehicle</label>
          <select className="form-input" style={{ width:200 }} value={selVehicle} onChange={e => setSelVehicle(e.target.value)}>
            <option value="all">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>From Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>To Date</label>
          <input className="form-input" type="date" style={{ width:150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b' }}>Group By</label>
          <select className="form-input" style={{ width:140 }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="vehicle">Vehicle</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelVehicle('all'); setFromDate(''); setToDate(''); }}>Clear</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:20 }}>
        {[
          { label:'Total Revenue', value: fmt(totalRev), color:'#1e40af', bg:'#dbeafe', icon:'💰' },
          { label:'Total Expenses', value: fmt(totalExp), color:'#dc2626', bg:'#fee2e2', icon:'📉' },
          { label:'Net Profit', value: fmt(netProfit), color: netProfit>=0?'#059669':'#dc2626', bg: netProfit>=0?'#d1fae5':'#fee2e2', icon: netProfit>=0?'📈':'📉' },
          { label:'Profit Margin', value: `${margin}%`, color:'#d97706', bg:'#fef3c7', icon:'🎯' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'12px 20px', borderRadius:12, background:s.bg, minWidth:160, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:'1.6rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:'0.72rem', fontWeight:600, color:s.color }}>{s.label}</div>
              <div style={{ fontSize:'1.1rem', fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <ExportBar
        onExcel={() => exportExcel(flatRows, cols, 'Profit_Loss_Report')}
        onPDF={() => exportPDF(flatRows, cols, 'Profit_Loss_Report', 'Profit & Loss Report')}
      />

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{nameHeader}</th>
              <th>Revenue (₹)</th>
              <th>Expenses (₹)</th>
              <th>Profit (₹)</th>
              <th>Margin %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight:600 }}>{row[nameKey]}</td>
                <td style={{ color:'#1e40af', fontWeight:600 }}>{fmt(row.revenue)}</td>
                <td style={{ color:'#dc2626', fontWeight:600 }}>{fmt(row.expenses)}</td>
                <td style={{ color: row.profit>=0?'#059669':'#dc2626', fontWeight:700 }}>{fmt(row.profit)}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:60, height:6, background:'#f1f5f9', borderRadius:3 }}>
                      <div style={{ width:`${Math.min(Math.abs(row.margin),100)}%`, height:'100%', borderRadius:3,
                        background: row.margin>=50?'#10b981':row.margin>=20?'#f59e0b':'#ef4444' }} />
                    </div>
                    <span style={{ fontSize:'0.8rem', fontWeight:600 }}>{row.margin}%</span>
                  </div>
                </td>
                <td>
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:600,
                    background: row.profit>=0?'#d1fae5':'#fee2e2',
                    color: row.profit>=0?'#059669':'#dc2626' }}>
                    {row.profit>=0 ? 'Profit' : 'Loss'}
                  </span>
                </td>
              </tr>
            ))}
            {tableData.length === 0 && <tr><td colSpan={6} className="empty-state">No data for selected filters.</td></tr>}
          </tbody>
          {tableData.length > 0 && (
            <tfoot>
              <tr style={{ background:'#f1f5f9', fontWeight:700 }}>
                <td>Total</td>
                <td style={{ color:'#1e40af' }}>{fmt(tableData.reduce((s,r)=>s+r.revenue,0))}</td>
                <td style={{ color:'#dc2626' }}>{fmt(tableData.reduce((s,r)=>s+r.expenses,0))}</td>
                <td style={{ color: netProfit>=0?'#059669':'#dc2626' }}>{fmt(tableData.reduce((s,r)=>s+r.profit,0))}</td>
                <td style={{ color:'#d97706' }}>{margin}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Reports Page
// ─────────────────────────────────────────────
export default function Reports() {
  const { rentals, expenses, vehicles, drivers, attendance, customers } = useApp();

  const TABS = [
    { id: 'customer',  label: '👤 Customer Transactions' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'expenses',  label: '📉 Expenses' },
    { id: 'pl',        label: '📈 Profit & Loss' },
  ];
  const [activeTab, setActiveTab] = useState('customer');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Generate, filter and export business reports</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:8, marginBottom:24, borderBottom:'2px solid #e2e8f0', paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding:'10px 20px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.88rem',
              background:'none', borderBottom: activeTab===t.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
              color: activeTab===t.id ? '#2563eb' : '#64748b', marginBottom: -2,
              borderRadius: '6px 6px 0 0',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'customer'   && <CustomerReport   rentals={rentals}   customers={customers} />}
      {activeTab === 'attendance' && <AttendanceReport attendance={attendance} drivers={drivers} />}
      {activeTab === 'expenses'   && <ExpensesReport   expenses={expenses}  vehicles={vehicles} />}
      {activeTab === 'pl'         && <ProfitLossReport rentals={rentals}    expenses={expenses} vehicles={vehicles} />}
    </div>
  );
}
