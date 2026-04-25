import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Attendance() {
  const { drivers, attendance, addAttendance, updateAttendance, deleteAttendance } = useApp();
  const { language, locale } = useLanguage();
  const isTamil = language === 'ta';

  const txt = isTamil ? {
    title: 'வருகை',
    subtitle: 'ஓட்டுநர் தினசரி வருகை கண்காணிப்பு',
    markAttendance: 'வருகை பதிவு',
    totalStaff: 'மொத்த பணியாளர்கள்',
    present: 'வந்தவர்',
    absent: 'வராதவர்',
    halfDay: 'அரை நாள்',
    leave: 'விடுப்பு',
    notMarked: 'பதிவு இல்லை',
    driverAttendance: 'ஓட்டுநர் வருகை',
    markAllPresent: 'அனைவரையும் வந்தவர் என குறி',
    monthlySummary: 'மாத சுருக்கம்',
    attendancePct: 'வருகை %',
    driver: 'ஓட்டுநர்',
    edit: 'திருத்து',
    mark: 'குறி',
    removeConfirm: 'நீக்கவா?',
    markTitle: 'வருகை பதிவு',
    selectDriver: 'ஓட்டுநரை தேர்வு செய்க',
    date: 'தேதி',
    status: 'நிலை',
    inTime: 'உள் நேரம்',
    outTime: 'வெளி நேரம்',
    notes: 'குறிப்புகள்',
    optionalNotes: 'விருப்ப குறிப்புகள்...',
    cancel: 'ரத்து',
    save: 'சேமி',
    update: 'புதுப்பி',
    selectDriverReq: 'ஓட்டுநரை தேர்வு செய்யவும்.',
    selectDateReq: 'தேதியை தேர்வு செய்யவும்.',
    saveFailed: 'வருகை சேமிக்க முடியவில்லை',
  } : {
    title: 'Attendance',
    subtitle: 'Track driver & operator daily attendance',
    markAttendance: 'Mark Attendance',
    totalStaff: 'Total Staff',
    present: 'Present',
    absent: 'Absent',
    halfDay: 'Half Day',
    leave: 'Leave',
    notMarked: 'Not Marked',
    driverAttendance: 'Driver Attendance',
    markAllPresent: 'Mark All Present',
    monthlySummary: 'Monthly Summary',
    attendancePct: 'Attendance %',
    driver: 'Driver',
    edit: 'Edit',
    mark: 'Mark',
    removeConfirm: 'Remove?',
    markTitle: 'Mark Attendance',
    selectDriver: 'Select driver',
    date: 'Date',
    status: 'Status',
    inTime: 'In Time',
    outTime: 'Out Time',
    notes: 'Notes',
    optionalNotes: 'Optional notes...',
    cancel: 'Cancel',
    save: 'Save',
    update: 'Update',
    selectDriverReq: 'Please select a driver.',
    selectDateReq: 'Please select a date.',
    saveFailed: 'Failed to save attendance',
  };

  const STATUS_CONFIG = {
    present: { label: txt.present, color: '#059669', bg: '#d1fae5', icon: '✅' },
    absent: { label: txt.absent, color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    halfday: { label: txt.halfDay, color: '#d97706', bg: '#fef3c7', icon: '🌓' },
    leave: { label: txt.leave, color: '#7c3aed', bg: '#f3e8ff', icon: '🏖️' },
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const toDateStr = (val) => (val ? val.toString().slice(0, 10) : '');
  const todayRecords = attendance.filter((a) => toDateStr(a.attDate || a.date) === selectedDate);
  const getRecord = (driverId) => todayRecords.find((a) => a.driverId === driverId);

  const openMark = (driver, existing) => {
    if (existing) {
      setForm({ ...existing, date: existing.attDate || existing.date });
      setEditing(existing.id);
    } else {
      setForm({
        driverId: driver.id,
        driverName: driver.name,
        date: selectedDate,
        status: 'present',
        inTime: '08:00',
        outTime: '17:00',
        overtime: 0,
        notes: '',
      });
      setEditing(null);
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.driverId) return alert(txt.selectDriverReq);
    if (!form.date) return alert(txt.selectDateReq);
    try {
      if (editing) {
        await updateAttendance({ ...form, id: editing });
      } else {
        const existing = attendance.find(
          (a) => a.driverId === Number(form.driverId) && toDateStr(a.attDate || a.date) === form.date,
        );
        if (existing) {
          await updateAttendance({ ...form, id: existing.id });
        } else {
          await addAttendance(form);
        }
      }
      setModal(false);
    } catch (err) {
      alert(`${txt.saveFailed}: ${err.message}`);
    }
  };

  const quickMark = async (driver, status) => {
    const existing = getRecord(driver.id);
    const record = {
      driverId: driver.id,
      driverName: driver.name,
      date: selectedDate,
      status,
      inTime: status === 'present' ? '08:00' : '',
      outTime: status === 'present' ? '17:00' : '',
      overtime: 0,
      notes: '',
    };
    try {
      if (existing) await updateAttendance({ ...record, id: existing.id });
      else await addAttendance(record);
    } catch (err) {
      alert(`${txt.saveFailed}: ${err.message}`);
    }
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const presentCount = todayRecords.filter((a) => a.status === 'present').length;
  const absentCount = todayRecords.filter((a) => a.status === 'absent').length;
  const markedCount = todayRecords.length;
  const totalDrivers = drivers.length;
  const monthRecords = attendance.filter((a) => toDateStr(a.attDate || a.date).startsWith(selectedDate.slice(0, 7)));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{txt.title}</div>
          <div className="page-subtitle">{txt.subtitle}</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({
              driverId: '',
              driverName: '',
              date: selectedDate,
              status: 'present',
              inTime: '08:00',
              outTime: '17:00',
              overtime: 0,
              notes: '',
            });
            setEditing(null);
            setModal(true);
          }}
        >
          <Plus size={16} /> {txt.markAttendance}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => changeDate(-1)}><ChevronLeft size={16} /></button>
          <div style={{ textAlign: 'center' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', fontSize: '1rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', outline: 'none', background: 'transparent' }}
            />
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => changeDate(1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: txt.totalStaff, value: totalDrivers, bg: '#eff6ff', color: '#1e40af', icon: '👥' },
          { label: txt.present, value: presentCount, bg: '#d1fae5', color: '#059669', icon: '✅' },
          { label: txt.absent, value: absentCount, bg: '#fee2e2', color: '#dc2626', icon: '❌' },
          { label: txt.notMarked, value: totalDrivers - markedCount, bg: '#f3f4f6', color: '#6b7280', icon: '⏳' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.3rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <h3 style={{ color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">{txt.driverAttendance} — {selectedDate}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => drivers.forEach((d) => quickMark(d, 'present'))}>{txt.markAllPresent}</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {drivers.map((driver) => {
            const rec = getRecord(driver.id);
            const cfg = STATUS_CONFIG[rec?.status] || { label: txt.notMarked, color: '#6b7280', bg: '#f3f4f6', icon: '⏳' };
            return (
              <div key={driver.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: rec ? `${cfg.bg}66` : '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1e40af', fontSize: '1rem' }}>
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{driver.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{driver.vehicleName}</div>
                    {rec && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{rec.inTime && `${txt.inTime}: ${rec.inTime}`} {rec.outTime && `· ${txt.outTime}: ${rec.outTime}`}{rec.notes && ` · ${rec.notes}`}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 20 }}>{cfg.icon} {cfg.label}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => openMark(driver, rec)}>{rec ? txt.edit : txt.mark}</button>
                  {rec && <button className="action-btn delete" onClick={() => { if (confirm(txt.removeConfirm)) deleteAttendance(rec.id); }}><X size={13} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span className="section-title">{txt.monthlySummary} — {selectedDate.slice(0, 7)}</span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>{txt.driver}</th>
                <th>{txt.present}</th>
                <th>{txt.absent}</th>
                <th>{txt.halfDay}</th>
                <th>{txt.leave}</th>
                <th>{txt.attendancePct}</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const recs = monthRecords.filter((a) => a.driverId === d.id);
                const p = recs.filter((a) => a.status === 'present').length;
                const a = recs.filter((a) => a.status === 'absent').length;
                const h = recs.filter((a) => a.status === 'halfday').length;
                const l = recs.filter((a) => a.status === 'leave').length;
                const total = recs.length;
                const pct = total > 0 ? ((p / total) * 100).toFixed(0) : 0;
                return (
                  <tr key={d.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1e40af', fontSize: '0.8rem' }}>{d.name.charAt(0)}</div>{d.name}</div></td>
                    <td><span style={{ color: '#059669', fontWeight: 600 }}>{p}</span></td>
                    <td><span style={{ color: '#dc2626', fontWeight: 600 }}>{a}</span></td>
                    <td><span style={{ color: '#d97706', fontWeight: 600 }}>{h}</span></td>
                    <td><span style={{ color: '#7c3aed', fontWeight: 600 }}>{l}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{txt.markTitle}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">{txt.driver}</label>
              {editing ? (
                <input className="form-input" value={form.driverName} readOnly style={{ background: '#f8fafc' }} />
              ) : (
                <select className="form-input" value={form.driverId} onChange={(e) => {
                  const d = drivers.find((dr) => dr.id === Number(e.target.value));
                  setForm((f) => ({ ...f, driverId: d ? d.id : '', driverName: d ? d.name : '' }));
                }}>
                  <option value="">{txt.selectDriver}</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">{txt.date}</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{txt.status}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setForm({ ...form, status: key })} style={{ padding: '8px 14px', borderRadius: 8, border: `2px solid ${form.status === key ? cfg.color : '#e2e8f0'}`, background: form.status === key ? cfg.bg : 'white', color: form.status === key ? cfg.color : '#64748b', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            {(form.status === 'present' || form.status === 'halfday') && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{txt.inTime}</label>
                  <input className="form-input" type="time" value={form.inTime} onChange={(e) => setForm({ ...form, inTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{txt.outTime}</label>
                  <input className="form-input" type="time" value={form.outTime} onChange={(e) => setForm({ ...form, outTime: e.target.value })} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{txt.notes}</label>
              <input className="form-input" placeholder={txt.optionalNotes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{txt.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? txt.update : txt.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
