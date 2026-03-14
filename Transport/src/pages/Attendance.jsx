import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  present:  { label:'Present', color:'#059669', bg:'#d1fae5', icon:'✅' },
  absent:   { label:'Absent',  color:'#dc2626', bg:'#fee2e2', icon:'❌' },
  halfday:  { label:'Half Day',color:'#d97706', bg:'#fef3c7', icon:'🌓' },
  leave:    { label:'Leave',   color:'#7c3aed', bg:'#f3e8ff', icon:'🏖️' },
};

export default function Attendance() {
  const { drivers, attendance, addAttendance, updateAttendance, deleteAttendance } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({});

  const toDateStr = (val) => val ? val.toString().slice(0, 10) : '';

  const todayRecords = attendance.filter(a => toDateStr(a.attDate || a.date) === selectedDate);

  const getRecord = (driverId) => todayRecords.find(a => a.driverId === driverId);

  const openMark = (driver, existing) => {
    if (existing) {
      setForm({ ...existing, date: existing.attDate || existing.date });
      setEditing(existing.id);
    } else {
      setForm({ driverId: driver.id, driverName: driver.name, date: selectedDate, status:'present', inTime:'08:00', outTime:'17:00', overtime:0, notes:'' });
      setEditing(null);
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.driverId) return alert('Please select a driver.');
    if (!form.date)     return alert('Please select a date.');
    try {
      if (editing) {
        await updateAttendance({ ...form, id: editing });
      } else {
        const existing = attendance.find(a =>
          a.driverId === Number(form.driverId) &&
          toDateStr(a.attDate || a.date) === form.date
        );
        if (existing) {
          await updateAttendance({ ...form, id: existing.id });
        } else {
          await addAttendance(form);
        }
      }
      setModal(false);
    } catch (err) {
      alert('Failed to save attendance: ' + err.message);
    }
  };

  const quickMark = async (driver, status) => {
    const existing = getRecord(driver.id);
    const record = { driverId: driver.id, driverName: driver.name, date: selectedDate, status, inTime: status==='present'?'08:00':'', outTime: status==='present'?'17:00':'', overtime:0, notes:'' };
    try {
      if (existing) { await updateAttendance({ ...record, id: existing.id }); }
      else           { await addAttendance(record); }
    } catch (err) {
      alert('Failed to save attendance: ' + err.message);
    }
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const presentCount  = todayRecords.filter(a => a.status==='present').length;
  const absentCount   = todayRecords.filter(a => a.status==='absent').length;
  const markedCount   = todayRecords.length;
  const totalDrivers  = drivers.length;

  // Monthly summary for current month
  const [month] = selectedDate.split('-');
  const monthRecords = attendance.filter(a => toDateStr(a.attDate || a.date).startsWith(selectedDate.slice(0,7)));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Attendance</div>
          <div className="page-subtitle">Track driver & operator daily attendance</div>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setForm({ driverId:'', driverName:'', date: selectedDate, status:'present', inTime:'08:00', outTime:'17:00', overtime:0, notes:'' });
          setEditing(null); setModal(true);
        }}>
          <Plus size={16}/> Mark Attendance
        </button>
      </div>

      {/* Date navigator */}
      <div className="card" style={{ marginBottom: 20, padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => changeDate(-1)}><ChevronLeft size={16}/></button>
          <div style={{ textAlign:'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ border:'none', fontSize:'1rem', fontWeight:700, color:'#1e293b', cursor:'pointer', outline:'none', background:'transparent' }}
            />
            <div style={{ fontSize:'0.78rem', color:'#64748b', marginTop:2 }}>
              {new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => changeDate(1)}><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* Day summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label:'Total Staff', value: totalDrivers, bg:'#eff6ff', color:'#1e40af', icon:'👥' },
          { label:'Present', value: presentCount, bg:'#d1fae5', color:'#059669', icon:'✅' },
          { label:'Absent', value: absentCount, bg:'#fee2e2', color:'#dc2626', icon:'❌' },
          { label:'Not Marked', value: totalDrivers - markedCount, bg:'#f3f4f6', color:'#6b7280', icon:'⏳' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize:'1.3rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <h3 style={{ color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Driver attendance cards */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Driver Attendance — {selectedDate}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => drivers.forEach(d => quickMark(d,'present'))}>
            Mark All Present
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {drivers.map(driver => {
            const rec = getRecord(driver.id);
            const cfg = STATUS_CONFIG[rec?.status || 'pending'] || { label:'Not Marked', color:'#6b7280', bg:'#f3f4f6', icon:'⏳' };
            return (
              <div key={driver.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 16px', borderRadius:10, border:'1px solid #e2e8f0',
                background: rec ? cfg.bg + '66' : '#f9fafb'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#1e40af', fontSize:'1rem' }}>
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{driver.name}</div>
                    <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{driver.vehicleName}</div>
                    {rec && <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:2 }}>
                      {rec.inTime && `In: ${rec.inTime}`} {rec.outTime && `· Out: ${rec.outTime}`}
                      {rec.notes && ` · ${rec.notes}`}
                    </div>}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.8rem', fontWeight:600, color: cfg.color, background: cfg.bg, padding:'3px 10px', borderRadius:20 }}>
                    {cfg.icon} {rec?.status ? rec.status.charAt(0).toUpperCase()+rec.status.slice(1) : 'Not Marked'}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => openMark(driver, rec)}>
                    {rec ? 'Edit' : 'Mark'}
                  </button>
                  {rec && (
                    <button className="action-btn delete" onClick={() => { if(confirm('Remove?')) deleteAttendance(rec.id); }}>
                      <X size={13}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly table */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">Monthly Summary — {selectedDate.slice(0,7)}</span>
        </div>
        <div className="table-container" style={{ border:'none' }}>
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Half Day</th>
                <th>Leave</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => {
                const recs = monthRecords.filter(a => a.driverId === d.id);
                const p = recs.filter(a=>a.status==='present').length;
                const a = recs.filter(a=>a.status==='absent').length;
                const h = recs.filter(a=>a.status==='halfday').length;
                const l = recs.filter(a=>a.status==='leave').length;
                const total = recs.length;
                const pct = total > 0 ? ((p/total)*100).toFixed(0) : 0;
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#1e40af', fontSize:'0.8rem' }}>
                          {d.name.charAt(0)}
                        </div>
                        {d.name}
                      </div>
                    </td>
                    <td><span style={{ color:'#059669', fontWeight:600 }}>{p}</span></td>
                    <td><span style={{ color:'#dc2626', fontWeight:600 }}>{a}</span></td>
                    <td><span style={{ color:'#d97706', fontWeight:600 }}>{h}</span></td>
                    <td><span style={{ color:'#7c3aed', fontWeight:600 }}>{l}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                          <div style={{ width:`${pct}%`, height:'100%', background: pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444', borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:'0.8rem', fontWeight:600 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark/Edit Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Mark Attendance</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="form-group">
              <label className="form-label">Driver</label>
              {editing ? (
                <input className="form-input" value={form.driverName} readOnly style={{ background:'#f8fafc' }} />
              ) : (
                <select className="form-input" value={form.driverId} onChange={e => {
                  const d = drivers.find(d => d.id === Number(e.target.value));
                  setForm(f => ({ ...f, driverId: d ? d.id : '', driverName: d ? d.name : '' }));
                }}>
                  <option value="">Select driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setForm({...form, status:key})}
                    style={{ padding:'8px 14px', borderRadius:8, border:`2px solid ${form.status===key ? cfg.color : '#e2e8f0'}`,
                      background: form.status===key ? cfg.bg : 'white', color: form.status===key ? cfg.color : '#64748b',
                      fontWeight:600, fontSize:'0.82rem', cursor:'pointer' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            {(form.status === 'present' || form.status === 'halfday') && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">In Time</label>
                  <input className="form-input" type="time" value={form.inTime} onChange={e => setForm({...form, inTime: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Out Time</label>
                  <input className="form-input" type="time" value={form.outTime} onChange={e => setForm({...form, outTime: e.target.value})} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Optional notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
