import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getVehicles,
  getMaintenanceTypes, createMaintenanceType, updateMaintenanceType, deleteMaintenanceType,
  getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord,
} from '../services/api';

// Normalize PascalCase DB keys to camelCase
function norm(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), v])
  );
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toInputDate(val) {
  if (!val) return '';
  return new Date(val).toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueStatus(nextDueDate, nextDueKm, currentKm) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let dateStatus = 'ok';
  if (nextDueDate) {
    const due = new Date(nextDueDate); due.setHours(0, 0, 0, 0);
    const diff = Math.floor((due - today) / 86400000);
    if (diff < 0)   dateStatus = 'overdue';
    else if (diff <= 30) dateStatus = 'due-soon';
  }
  if (dateStatus === 'ok' && !nextDueDate) dateStatus = 'no-due';
  return dateStatus;
}

const STATUS_STYLES = {
  overdue:  { bg: '#fee2e2', color: '#991b1b', label: 'OVERDUE' },
  'due-soon': { bg: '#fef9c3', color: '#854d0e', label: 'DUE SOON' },
  ok:       { bg: '#dcfce7', color: '#166534', label: 'UP TO DATE' },
  'no-due': { bg: '#f1f5f9', color: '#64748b', label: 'NO DUE SET' },
};

const TODAY = new Date().toISOString().slice(0, 10);

const blankRecord = {
  vehicleId: '', vehicleName: '', typeId: '', typeName: '',
  serviceDate: TODAY, kmAtService: '', nextDueDate: '', nextDueKm: '',
  cost: '', doneBy: '', notes: '',
};
const blankMType = { name: '', emoji: '🔧', defaultKmInterval: '', defaultDaysInterval: '' };

export default function Maintenance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('records');

  const [vehicles, setVehicles] = useState([]);
  const [types,    setTypes]    = useState([]);
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filters
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterType,    setFilterType]    = useState('');

  // Record modal
  const [recModal,  setRecModal]  = useState(false);
  const [recForm,   setRecForm]   = useState(blankRecord);
  const [editRecId, setEditRecId] = useState(null);
  const [recSaving, setRecSaving] = useState(false);

  // Type config modal
  const [typeModal,  setTypeModal]  = useState(false);
  const [typeForm,   setTypeForm]   = useState(blankMType);
  const [editTypeId, setEditTypeId] = useState(null);
  const [typeSaving, setTypeSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [vList, tList, rList] = await Promise.all([getVehicles(), getMaintenanceTypes(), getMaintenanceRecords()]);
      setVehicles(vList.map(norm));
      setTypes(tList.map(norm));
      setRecords(rList.map(norm));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const statTotal    = records.length;
  const statOverdue  = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) < today).length;
  const statDueSoon  = records.filter(r => {
    if (!r.nextDueDate) return false;
    const due = new Date(r.nextDueDate);
    return due >= today && due <= new Date(today.getTime() + 30 * 86400000);
  }).length;
  const statThisMonth = records.filter(r => r.serviceDate && new Date(r.serviceDate) >= thisMonthStart).length;

  // ── Filtered records ───────────────────────────────────────────────────────
  const filteredRecords = records
    .filter(r => !filterVehicle || r.vehicleId == filterVehicle)
    .filter(r => !filterType    || r.typeId    == filterType)
    .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

  // ── Due Now records (next due within 30 days or overdue) ───────────────────
  const dueNowRecords = records
    .filter(r => {
      if (!r.nextDueDate) return false;
      const due = new Date(r.nextDueDate); due.setHours(0, 0, 0, 0);
      return due <= new Date(today.getTime() + 30 * 86400000);
    })
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

  // ── Record modal helpers ───────────────────────────────────────────────────
  function openAddRecord(prefill = {}) {
    setRecForm({ ...blankRecord, ...prefill });
    setEditRecId(null);
    setRecModal(true);
  }

  function openEditRecord(r) {
    setRecForm({
      vehicleId:   r.vehicleId,
      vehicleName: r.vehicleName || '',
      typeId:      r.typeId,
      typeName:    r.typeName || '',
      serviceDate: toInputDate(r.serviceDate),
      kmAtService: r.kmAtService || '',
      nextDueDate: toInputDate(r.nextDueDate),
      nextDueKm:   r.nextDueKm || '',
      cost:        r.cost || '',
      doneBy:      r.doneBy || '',
      notes:       r.notes || '',
    });
    setEditRecId(r.id);
    setRecModal(true);
  }

  function handleTypeChange(e) {
    const typeId = parseInt(e.target.value);
    const type   = types.find(t => t.id === typeId);
    setRecForm(f => {
      const nextDueDate = type?.defaultDaysInterval && f.serviceDate
        ? addDays(f.serviceDate, type.defaultDaysInterval) : '';
      const nextDueKm = type?.defaultKmInterval && f.kmAtService
        ? (parseInt(f.kmAtService) || 0) + type.defaultKmInterval : '';
      return { ...f, typeId, typeName: type?.name || '', nextDueDate, nextDueKm };
    });
  }

  function handleServiceDateChange(e) {
    const serviceDate = e.target.value;
    const type = types.find(t => t.id == recForm.typeId);
    const nextDueDate = type?.defaultDaysInterval ? addDays(serviceDate, type.defaultDaysInterval) : recForm.nextDueDate;
    setRecForm(f => ({ ...f, serviceDate, nextDueDate }));
  }

  function handleKmAtServiceChange(e) {
    const kmAtService = e.target.value;
    const type = types.find(t => t.id == recForm.typeId);
    const nextDueKm = type?.defaultKmInterval && kmAtService
      ? (parseInt(kmAtService) || 0) + type.defaultKmInterval : recForm.nextDueKm;
    setRecForm(f => ({ ...f, kmAtService, nextDueKm }));
  }

  async function saveRecord() {
    setRecSaving(true);
    try {
      const vehicle = vehicles.find(v => v.id == recForm.vehicleId);
      const payload = {
        ...recForm,
        vehicleName: vehicle ? (vehicle.name || vehicle.regNo || '') : recForm.vehicleName,
      };
      let saved;
      if (editRecId) {
        saved = norm(await updateMaintenanceRecord(editRecId, payload));
        setRecords(prev => prev.map(r => r.id === editRecId ? saved : r));
      } else {
        saved = norm(await createMaintenanceRecord(payload));
        setRecords(prev => [saved, ...prev]);
      }
      setRecModal(false);
    } catch (e) { alert(e.message); }
    finally { setRecSaving(false); }
  }

  async function removeRecord(id) {
    if (!window.confirm('Delete this maintenance record?')) return;
    try {
      await deleteMaintenanceRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert(e.message); }
  }

  // ── Type config helpers ────────────────────────────────────────────────────
  function openAddType() { setTypeForm(blankMType); setEditTypeId(null); setTypeModal(true); }
  function openEditType(t) {
    setTypeForm({ name: t.name, emoji: t.emoji, defaultKmInterval: t.defaultKmInterval || '', defaultDaysInterval: t.defaultDaysInterval || '' });
    setEditTypeId(t.id); setTypeModal(true);
  }

  async function saveType() {
    setTypeSaving(true);
    try {
      const payload = {
        ...typeForm,
        defaultKmInterval:   typeForm.defaultKmInterval   ? parseInt(typeForm.defaultKmInterval)   : null,
        defaultDaysInterval: typeForm.defaultDaysInterval ? parseInt(typeForm.defaultDaysInterval) : null,
      };
      let saved;
      if (editTypeId) {
        saved = norm(await updateMaintenanceType(editTypeId, payload));
        setTypes(prev => prev.map(t => t.id === editTypeId ? saved : t));
      } else {
        saved = norm(await createMaintenanceType(payload));
        setTypes(prev => [...prev, saved]);
      }
      setTypeModal(false);
    } catch (e) { alert(e.message); }
    finally { setTypeSaving(false); }
  }

  async function removeType(t) {
    if (t.isSystem) { alert('Cannot delete system maintenance types. Edit them instead.'); return; }
    if (!window.confirm(`Delete type "${t.name}"?`)) return;
    try {
      await deleteMaintenanceType(t.id);
      setTypes(prev => prev.filter(x => x.id !== t.id));
    } catch (e) { alert(e.message); }
  }

  // ── Row component shared between tabs ─────────────────────────────────────
  function RecordRow({ r }) {
    const status = dueStatus(r.nextDueDate);
    const sty    = STATUS_STYLES[status];
    const veh    = vehicles.find(v => v.id == r.vehicleId);
    const typ    = types.find(t => t.id == r.typeId);
    return (
      <tr>
        <td>{veh?.name || r.vehicleName}<br/><span style={{ fontSize: '0.72rem', color: '#64748b' }}>{veh?.regNo || ''}</span></td>
        <td>{typ?.emoji || ''} {r.typeName}</td>
        <td>{fmtDate(r.serviceDate)}</td>
        <td>{r.kmAtService ? r.kmAtService.toLocaleString('en-IN') + ' km' : '—'}</td>
        <td style={{ fontWeight: 600, color: sty.color }}>{fmtDate(r.nextDueDate)}</td>
        <td>{r.nextDueKm ? r.nextDueKm.toLocaleString('en-IN') + ' km' : '—'}</td>
        <td>
          <span style={{ background: sty.bg, color: sty.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
            {sty.label}
          </span>
        </td>
        <td>{r.cost ? '₹' + Number(r.cost).toLocaleString('en-IN') : '—'}</td>
        <td>{r.doneBy || '—'}</td>
        <td>
          <button className="btn-icon" onClick={() => openEditRecord(r)} title="Edit">✏️</button>
          {isAdmin && <button className="btn-icon" onClick={() => removeRecord(r.id)} title="Delete">🗑️</button>}
        </td>
      </tr>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="page-container"><p>Loading…</p></div>;
  if (error)   return <div className="page-container"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔧 Maintenance</h1>
          <p className="page-subtitle">Track service history and schedule for all vehicles</p>
        </div>
        <button className="btn-primary" onClick={() => openAddRecord()}>+ Add Record</button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Records', value: statTotal,     bg: '#f0f9ff', color: '#0369a1' },
          { label: 'Overdue',       value: statOverdue,   bg: '#fee2e2', color: '#991b1b' },
          { label: 'Due ≤ 30d',     value: statDueSoon,   bg: '#fef9c3', color: '#854d0e' },
          { label: 'This Month',    value: statThisMonth, bg: '#f0fdf4', color: '#166534' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.bg }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          ['records', 'All Records'],
          ['due',     `Due Now (${dueNowRecords.length})`],
          ...(isAdmin ? [['config', 'Config']] : []),
        ].map(([key, label]) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ALL RECORDS ──────────────────────────────────────────────────── */}
      {tab === 'records' && (
        <div className="table-card">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ width: 200, height: 36 }}
              value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name || v.regNo}</option>)}
            </select>
            <select className="form-input" style={{ width: 200, height: 36 }}
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
            {(filterVehicle || filterType) && (
              <button className="btn-secondary" style={{ height: 36 }}
                onClick={() => { setFilterVehicle(''); setFilterType(''); }}>Clear</button>
            )}
          </div>
          {filteredRecords.length === 0 ? (
            <p style={{ padding: 20, color: '#64748b' }}>No records found. Click "Add Record" to get started.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Vehicle</th><th>Service Type</th><th>Service Date</th>
                    <th>KM at Service</th><th>Next Due Date</th><th>Next Due KM</th>
                    <th>Status</th><th>Cost</th><th>Done By</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => <RecordRow key={r.id} r={r} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DUE NOW ──────────────────────────────────────────────────────── */}
      {tab === 'due' && (
        <div className="table-card">
          {dueNowRecords.length === 0 ? (
            <p style={{ padding: 20, color: '#166534' }}>✅ All maintenance is up to date. Nothing due in the next 30 days.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Vehicle</th><th>Service Type</th><th>Last Serviced</th>
                    <th>KM at Last Service</th><th>Next Due Date</th><th>Next Due KM</th>
                    <th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dueNowRecords.map(r => {
                    const status = dueStatus(r.nextDueDate);
                    const sty    = STATUS_STYLES[status];
                    const veh    = vehicles.find(v => v.id == r.vehicleId);
                    const typ    = types.find(t => t.id == r.typeId);
                    return (
                      <tr key={r.id}>
                        <td>{veh?.name || r.vehicleName}<br/><span style={{ fontSize: '0.72rem', color: '#64748b' }}>{veh?.regNo || ''}</span></td>
                        <td>{typ?.emoji || ''} {r.typeName}</td>
                        <td>{fmtDate(r.serviceDate)}</td>
                        <td>{r.kmAtService ? r.kmAtService.toLocaleString('en-IN') + ' km' : '—'}</td>
                        <td style={{ fontWeight: 600, color: sty.color }}>{fmtDate(r.nextDueDate)}</td>
                        <td>{r.nextDueKm ? r.nextDueKm.toLocaleString('en-IN') + ' km' : '—'}</td>
                        <td>
                          <span style={{ background: sty.bg, color: sty.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {sty.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                            onClick={() => openAddRecord({
                              vehicleId:   r.vehicleId,
                              vehicleName: r.vehicleName,
                              typeId:      r.typeId,
                              typeName:    r.typeName,
                              serviceDate: TODAY,
                            })}
                          >
                            Mark Serviced
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG TAB ───────────────────────────────────────────────────── */}
      {tab === 'config' && isAdmin && (
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Maintenance Types</h3>
            <button className="btn-primary" onClick={openAddType}>+ Add Type</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Emoji</th><th>Name</th><th>KM Interval</th><th>Days Interval</th><th>System</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{t.emoji}</td>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>{t.defaultKmInterval ? t.defaultKmInterval.toLocaleString('en-IN') + ' km' : '—'}</td>
                  <td>{t.defaultDaysInterval ? t.defaultDaysInterval + ' days' : '—'}</td>
                  <td>{t.isSystem ? '✅ System' : '—'}</td>
                  <td>
                    <button className="btn-icon" onClick={() => openEditType(t)} title="Edit">✏️</button>
                    {!t.isSystem && (
                      <button className="btn-icon" onClick={() => removeType(t)} title="Delete">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RECORD MODAL ─────────────────────────────────────────────────── */}
      {recModal && (
        <div className="modal-overlay" onClick={() => setRecModal(false)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editRecId ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Vehicle *</label>
                <select className="form-input" value={recForm.vehicleId}
                  onChange={e => setRecForm(f => ({ ...f, vehicleId: e.target.value, vehicleName: vehicles.find(v => v.id == e.target.value)?.name || vehicles.find(v => v.id == e.target.value)?.regNo || '' }))}>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name || v.regNo}{v.name ? ` (${v.regNo})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service Type *</label>
                <select className="form-input" value={recForm.typeId} onChange={handleTypeChange}>
                  <option value="">Select type</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service Date *</label>
                <input type="date" className="form-input" value={recForm.serviceDate}
                  onChange={handleServiceDateChange} />
              </div>
              <div className="form-group">
                <label className="form-label">KM at Service</label>
                <input type="number" className="form-input" value={recForm.kmAtService} min={0}
                  onChange={handleKmAtServiceChange} placeholder="e.g. 45000" />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Next Due Date
                  <span style={{ color: '#64748b', fontSize: '0.74rem', marginLeft: 6 }}>(auto-filled from type)</span>
                </label>
                <input type="date" className="form-input" value={recForm.nextDueDate}
                  onChange={e => setRecForm(f => ({ ...f, nextDueDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Next Due KM
                  <span style={{ color: '#64748b', fontSize: '0.74rem', marginLeft: 6 }}>(auto-filled)</span>
                </label>
                <input type="number" className="form-input" value={recForm.nextDueKm} min={0}
                  onChange={e => setRecForm(f => ({ ...f, nextDueKm: e.target.value }))} placeholder="e.g. 50000" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input type="number" className="form-input" value={recForm.cost} min={0} step="0.01"
                  onChange={e => setRecForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Done By</label>
                <input className="form-input" value={recForm.doneBy}
                  onChange={e => setRecForm(f => ({ ...f, doneBy: e.target.value }))}
                  placeholder="Mechanic / Workshop" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={recForm.notes}
                  onChange={e => setRecForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRecModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveRecord}
                disabled={recSaving || !recForm.vehicleId || !recForm.typeId || !recForm.serviceDate}>
                {recSaving ? 'Saving…' : editRecId ? 'Update' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TYPE CONFIG MODAL ────────────────────────────────────────────── */}
      {typeModal && (
        <div className="modal-overlay" onClick={() => setTypeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTypeId ? 'Edit Maintenance Type' : 'Add Maintenance Type'}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <input className="form-input" value={typeForm.emoji} maxLength={5}
                  onChange={e => setTypeForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🔧" />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={typeForm.name}
                  onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Spark Plug Change" />
              </div>
              <div className="form-group">
                <label className="form-label">KM Interval (optional)</label>
                <input type="number" className="form-input" value={typeForm.defaultKmInterval} min={0}
                  onChange={e => setTypeForm(f => ({ ...f, defaultKmInterval: e.target.value }))}
                  placeholder="e.g. 10000" />
              </div>
              <div className="form-group">
                <label className="form-label">Days Interval (optional)</label>
                <input type="number" className="form-input" value={typeForm.defaultDaysInterval} min={0}
                  onChange={e => setTypeForm(f => ({ ...f, defaultDaysInterval: e.target.value }))}
                  placeholder="e.g. 180" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setTypeModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveType} disabled={typeSaving || !typeForm.name}>
                {typeSaving ? 'Saving…' : editTypeId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
