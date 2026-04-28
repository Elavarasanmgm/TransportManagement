import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getVehicles,
  getVehicleDocumentTypes, createVehicleDocumentType, updateVehicleDocumentType, deleteVehicleDocumentType,
  getVehicleDocuments, getVehicleDocumentFile, upsertVehicleDocument, deleteVehicleDocument,
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

function addDays(dateStr, days) {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function expiryStatus(expiryDate) {
  if (!expiryDate) return 'missing';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp   = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  const diff  = Math.floor((exp - today) / 86400000);
  if (diff < 0)   return 'expired';
  if (diff <= 30) return 'due-soon';
  return 'valid';
}

const STATUS_STYLES = {
  valid:    { bg: '#dcfce7', color: '#166534', label: 'VALID' },
  'due-soon': { bg: '#fef9c3', color: '#854d0e', label: 'DUE SOON' },
  expired:  { bg: '#fee2e2', color: '#991b1b', label: 'EXPIRED' },
  missing:  { bg: '#f1f5f9', color: '#64748b', label: '—' },
};

const blankType = { name: '', emoji: '📄', defaultValidityDays: 365 };
const blankDoc  = { vehicleId: '', vehicleName: '', typeId: '', typeName: '', docNo: '', issueDate: '', expiryDate: '', notes: '', fileName: '', fileType: '', fileData: null };

export default function VehicleDocuments() {
  const { user } = useAuth();
  const isTamil  = false; // integrate LanguageContext if needed
  const isAdmin  = user?.role === 'admin';
  const [tab, setTab]     = useState('grid');

  const [vehicles, setVehicles] = useState([]);
  const [types,    setTypes]    = useState([]);
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Doc modal
  const [docModal,   setDocModal]   = useState(false);
  const [docForm,    setDocForm]    = useState(blankDoc);
  const [docSaving,  setDocSaving]  = useState(false);
  const [docTarget,  setDocTarget]  = useState(null); // { vehicleId, vehicleName, typeId, typeName, defaultValidityDays }

  // Type config modal
  const [typeModal,  setTypeModal]  = useState(false);
  const [typeForm,   setTypeForm]   = useState(blankType);
  const [editTypeId, setEditTypeId] = useState(null);
  const [typeSaving, setTypeSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [vList, tList, dList] = await Promise.all([getVehicles(), getVehicleDocumentTypes(), getVehicleDocuments()]);
      setVehicles(vList.map(norm));
      setTypes(tList.map(norm));
      setDocs(dList.map(norm));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const statTracked  = docs.length;
  const statExpired  = docs.filter(d => expiryStatus(d.expiryDate) === 'expired').length;
  const statDueSoon  = docs.filter(d => expiryStatus(d.expiryDate) === 'due-soon').length;
  const statValid    = docs.filter(d => expiryStatus(d.expiryDate) === 'valid').length;

  // ── Grid helpers ───────────────────────────────────────────────────────────
  function docFor(vehicleId, typeId) {
    return docs.find(d => d.vehicleId == vehicleId && d.typeId == typeId) || null;
  }

  function openDocModal(vehicle, type) {
    const existing = docFor(vehicle.id, type.id);
    setDocTarget({ ...type });
    if (existing) {
      setDocForm({
        vehicleId:   vehicle.id,
        vehicleName: vehicle.name || vehicle.regNo || '',
        typeId:      type.id,
        typeName:    type.name,
        docNo:       existing.docNo || '',
        issueDate:   existing.issueDate ? existing.issueDate.slice(0, 10) : '',
        expiryDate:  existing.expiryDate ? existing.expiryDate.slice(0, 10) : '',
        notes:       existing.notes || '',
        fileName:    existing.fileName || '',
        fileType:    existing.fileType || '',
        fileData:    null, // not loaded — backend keeps existing if fileData is null and fileName is non-empty
      });
    } else {
      setDocForm({ ...blankDoc, vehicleId: vehicle.id, vehicleName: vehicle.name || vehicle.regNo || '', typeId: type.id, typeName: type.name });
    }
    setDocModal(true);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5 MB. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // strip data:...;base64,
      setDocForm(f => ({ ...f, fileData: base64, fileName: file.name, fileType: file.type }));
    };
    reader.readAsDataURL(file);
  }

  async function viewFile(docId) {
    try {
      const data = await getVehicleDocumentFile(docId);
      if (!data?.fileData) { alert('No file attached to this document.'); return; }
      const byteChars = atob(data.fileData);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: data.fileType || 'application/octet-stream' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // open images/PDFs inline; download everything else
      if (data.fileType && (data.fileType.startsWith('image/') || data.fileType === 'application/pdf')) {
        link.target = '_blank';
        link.rel    = 'noopener noreferrer';
      } else {
        link.download = data.fileName || 'attachment';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { alert('Could not load file: ' + e.message); }
  }

  function handleIssueDateChange(e) {
    const issueDate = e.target.value;
    const expiryDate = docTarget?.defaultValidityDays ? addDays(issueDate, docTarget.defaultValidityDays) : '';
    setDocForm(f => ({ ...f, issueDate, expiryDate }));
  }

  async function saveDoc() {
    setDocSaving(true);
    try {
      // Send null for fileName when user cleared the file (signals backend to remove it)
      const payload = {
        ...docForm,
        fileName: docForm.fileName || (docForm.fileData === null && docForm.fileName === '' ? null : docForm.fileName),
      };
      const saved = norm(await upsertVehicleDocument(payload));
      setDocs(prev => {
        const idx = prev.findIndex(d => d.vehicleId == saved.vehicleId && d.typeId == saved.typeId);
        return idx >= 0 ? prev.map((d, i) => i === idx ? saved : d) : [...prev, saved];
      });
      setDocModal(false);
    } catch (e) { alert(e.message); }
    finally { setDocSaving(false); }
  }

  async function removeDoc(id) {
    if (!window.confirm('Delete this document record?')) return;
    try {
      await deleteVehicleDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (e) { alert(e.message); }
  }

  // ── Timeline — sorted by urgency ──────────────────────────────────────────
  const timelineRows = [...docs]
    .map(d => ({ ...d, status: expiryStatus(d.expiryDate) }))
    .sort((a, b) => {
      const order = { expired: 0, 'due-soon': 1, missing: 2, valid: 3 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });

  // ── Type config ────────────────────────────────────────────────────────────
  function openAddType() { setTypeForm(blankType); setEditTypeId(null); setTypeModal(true); }
  function openEditType(t) { setTypeForm({ name: t.name, emoji: t.emoji, defaultValidityDays: t.defaultValidityDays }); setEditTypeId(t.id); setTypeModal(true); }

  async function saveType() {
    setTypeSaving(true);
    try {
      let saved;
      if (editTypeId) {
        saved = norm(await updateVehicleDocumentType(editTypeId, typeForm));
        setTypes(prev => prev.map(t => t.id === editTypeId ? saved : t));
      } else {
        saved = norm(await createVehicleDocumentType(typeForm));
        setTypes(prev => [...prev, saved]);
      }
      setTypeModal(false);
    } catch (e) { alert(e.message); }
    finally { setTypeSaving(false); }
  }

  async function removeType(t) {
    if (t.isSystem) { alert('Cannot delete system document types.'); return; }
    if (!window.confirm(`Delete type "${t.name}"?`)) return;
    try {
      await deleteVehicleDocumentType(t.id);
      setTypes(prev => prev.filter(x => x.id !== t.id));
    } catch (e) { alert(e.message); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="page-container"><p>Loading…</p></div>;
  if (error)   return <div className="page-container"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Vehicle Documents</h1>
          <p className="page-subtitle">Track insurance, permits, fitness and other certificates for your fleet</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Tracked',  value: statTracked,  bg: '#f0f9ff', color: '#0369a1' },
          { label: 'Expired',  value: statExpired,  bg: '#fee2e2', color: '#991b1b' },
          { label: 'Due ≤ 30d',value: statDueSoon,  bg: '#fef9c3', color: '#854d0e' },
          { label: 'Valid',    value: statValid,    bg: '#dcfce7', color: '#166534' },
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
          ['grid',     'Grid View'],
          ['timeline', 'Timeline'],
          ...(isAdmin ? [['config', 'Config']] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >{label}</button>
        ))}
      </div>

      {/* ── GRID VIEW ────────────────────────────────────────────────────── */}
      {tab === 'grid' && (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          {vehicles.length === 0 ? (
            <p style={{ padding: 20, color: '#64748b' }}>No vehicles found. Add vehicles first.</p>
          ) : (
            <table className="data-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>Vehicle</th>
                  {types.map(t => (
                    <th key={t.id} style={{ textAlign: 'center', minWidth: 110 }}>
                      {t.emoji} {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div>{v.name || v.regNo}</div>
                      {v.name && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.regNo}</div>}
                    </td>
                    {types.map(t => {
                      const doc = docFor(v.id, t.id);
                      const status = doc ? expiryStatus(doc.expiryDate) : 'missing';
                      const sty = STATUS_STYLES[status];
                      return (
                        <td key={t.id} style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => openDocModal(v, t)}
                            style={{
                              background: sty.bg, color: sty.color,
                              border: 'none', borderRadius: 6, padding: '4px 10px',
                              fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                              display: 'block', width: '100%',
                            }}
                            title={doc?.expiryDate ? `Expires: ${fmtDate(doc.expiryDate)}` : 'Click to add'}
                          >
                            {status === 'missing' ? '+ Add' : (
                              <>
                                {sty.label}
                                {doc?.fileName && <span style={{ fontSize: '0.72rem', marginLeft: 3 }}>📎</span>}
                                <div style={{ fontSize: '0.68rem', fontWeight: 400, marginTop: 1 }}>
                                  {fmtDate(doc?.expiryDate)}
                                </div>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ padding: '8px 16px', fontSize: '0.74rem', color: '#94a3b8' }}>
            Click any cell to add / edit that document. Colour: 🟢 Valid &nbsp;🟡 Due ≤ 30d &nbsp;🔴 Expired &nbsp;⬜ Not added
          </p>
        </div>
      )}

      {/* ── TIMELINE VIEW ────────────────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div className="table-card">
          {timelineRows.length === 0 ? (
            <p style={{ padding: 20, color: '#64748b' }}>No document records yet. Use Grid View to add.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Vehicle</th>
                  <th>Document</th>
                  <th>Doc No</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Notes</th>
                  <th>File</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {timelineRows.map((d, i) => {
                  const sty = STATUS_STYLES[d.status];
                  const veh = vehicles.find(v => v.id == d.vehicleId);
                  const typ = types.find(t => t.id == d.typeId);
                  return (
                    <tr key={i}>
                      <td>
                        <span style={{
                          background: sty.bg, color: sty.color, borderRadius: 5,
                          padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                        }}>{sty.label}</span>
                      </td>
                      <td>{veh?.name || d.vehicleName}<br/><span style={{ fontSize:'0.72rem', color:'#64748b' }}>{veh?.regNo || ''}</span></td>
                      <td>{typ?.emoji || ''} {d.typeName}</td>
                      <td>{d.docNo || '—'}</td>
                      <td>{fmtDate(d.issueDate)}</td>
                      <td style={{ fontWeight: 600, color: sty.color }}>{fmtDate(d.expiryDate)}</td>
                      <td style={{ maxWidth: 180, whiteSpace: 'pre-wrap' }}>{d.notes || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {d.fileName ? (
                          <button
                            className="btn-icon"
                            onClick={() => viewFile(d.id)}
                            title={d.fileName}
                            style={{ fontSize: '1rem' }}
                          >📎</button>
                        ) : '—'}
                      </td>
                      {isAdmin && (
                        <td>
                          <button className="btn-icon" onClick={() => openDocModal(veh || {id: d.vehicleId, name: d.vehicleName}, typ || {id: d.typeId, name: d.typeName, emoji: '', defaultValidityDays: 365})} title="Edit">✏️</button>
                          <button className="btn-icon" onClick={() => removeDoc(d.id)} title="Delete">🗑️</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── CONFIG TAB ───────────────────────────────────────────────────── */}
      {tab === 'config' && isAdmin && (
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Document Types</h3>
            <button className="btn-primary" onClick={openAddType}>+ Add Type</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Emoji</th>
                <th>Name</th>
                <th>Default Validity</th>
                <th>System</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{t.emoji}</td>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>{t.defaultValidityDays} days</td>
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

      {/* ── DOC MODAL ────────────────────────────────────────────────────── */}
      {docModal && (
        <div className="modal-overlay" onClick={() => setDocModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {docTarget?.emoji || '📄'} {docForm.typeName} — {docForm.vehicleName}
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Document Number</label>
                <input className="form-input" value={docForm.docNo}
                  onChange={e => setDocForm(f => ({ ...f, docNo: e.target.value }))}
                  placeholder="e.g. INS-2024-001234" />
              </div>
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input type="date" className="form-input" value={docForm.issueDate}
                  onChange={handleIssueDateChange} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Expiry Date
                  {docTarget?.defaultValidityDays && (
                    <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 6 }}>
                      (auto-filled: {docTarget.defaultValidityDays}d from issue)
                    </span>
                  )}
                </label>
                <input type="date" className="form-input" value={docForm.expiryDate}
                  onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={docForm.notes}
                  onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes" />
              </div>

              {/* File Upload */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Attachment (PDF / Image)</label>

                {/* Show existing / newly-selected file */}
                {docForm.fileName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6,
                                padding: '6px 10px' }}>
                    <span style={{ fontSize: '1rem' }}>📎</span>
                    <span style={{ fontSize: '0.84rem', color: '#0369a1', flex: 1, wordBreak: 'break-all' }}>
                      {docForm.fileName}
                    </span>
                    {/* View button only for saved records where fileData is not re-uploaded */}
                    {!docForm.fileData && docs.find(d => d.vehicleId == docForm.vehicleId && d.typeId == docForm.typeId)?.id && (
                      <button
                        type="button"
                        onClick={() => viewFile(docs.find(d => d.vehicleId == docForm.vehicleId && d.typeId == docForm.typeId).id)}
                        style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4,
                                 padding: '2px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                      >View</button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDocForm(f => ({ ...f, fileData: null, fileName: '', fileType: '' }))}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
                               fontSize: '0.8rem', fontWeight: 600, padding: '0 4px' }}
                      title="Remove attachment"
                    >✕ Remove</button>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3, display: 'block' }}>
                  PDF, JPG, PNG or WEBP · max 5 MB
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDocModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveDoc} disabled={docSaving}>
                {docSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TYPE CONFIG MODAL ────────────────────────────────────────────── */}
      {typeModal && (
        <div className="modal-overlay" onClick={() => setTypeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTypeId ? 'Edit Document Type' : 'Add Document Type'}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <input className="form-input" value={typeForm.emoji} maxLength={5}
                  onChange={e => setTypeForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="e.g. 📄" />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={typeForm.name}
                  onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Road Tax" />
              </div>
              <div className="form-group">
                <label className="form-label">Default Validity (days)</label>
                <input type="number" className="form-input" min={1} value={typeForm.defaultValidityDays}
                  onChange={e => setTypeForm(f => ({ ...f, defaultValidityDays: parseInt(e.target.value) || 365 }))} />
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
