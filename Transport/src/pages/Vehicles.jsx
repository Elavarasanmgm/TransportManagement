import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const statusColors = { available: 'badge-success', 'on-rent': 'badge-info', maintenance: 'badge-danger' };

// Fallback colour palette cycling for vehicle type card backgrounds
const paletteBg = ['#eff6ff','#fffbeb','#f0fdf4','#faf5ff','#fff1f2','#ecfdf5','#fef3c7','#e0f2fe'];

const emptyForm = { name:'', type:'', regNo:'', model:'', year:'', status:'available', driver:'', dailyRate:'', hourlyRate:'', color:'#3b82f6', emoji:'🚛' };

export default function Vehicles() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, vehicleTypes, addVehicleType } = useApp();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'driver';
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);

  // "Add new type" inline state
  const [newTypeName,  setNewTypeName]  = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('🚛');
  const [addingType,   setAddingType]   = useState(false);
  const [typeError,    setTypeError]    = useState('');

  // Dynamic lookups from vehicleTypes
  const typeEmojiMap = Object.fromEntries((vehicleTypes || []).map(t => [t.name, t.emoji]));
  const typeBgMap    = Object.fromEntries((vehicleTypes || []).map((t, i) => [t.name, paletteBg[i % paletteBg.length]]));

  const filtered = vehicles.filter(v => {
    const matchSearch = v.name?.toLowerCase().includes(search.toLowerCase()) ||
                        v.regNo?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  // Initialise form with first vehicle type if none set
  const defaultType = vehicleTypes?.[0]?.name || 'Lorry';
  const openAdd  = () => { setForm({ ...emptyForm, type: defaultType }); setEditing(null); setModal(true); };
  const openEdit = (v) => { setForm(v); setEditing(v.id); setModal(true); };

  const handleSave = () => {
    if (!form.regNo || !form.model) return alert('Please fill required fields.');
    const emoji   = typeEmojiMap[form.type] || form.emoji || '🚛';
    const payload = { ...form, emoji, name: `${form.type} - ${form.regNo}`, dailyRate: Number(form.dailyRate), hourlyRate: Number(form.hourlyRate) };
    editing ? updateVehicle(payload) : addVehicle(payload);
    setModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this vehicle?')) deleteVehicle(id);
  };

  async function handleAddType() {
    if (!newTypeName.trim()) return setTypeError('Type name is required');
    setTypeError('');
    try {
      await addVehicleType({ name: newTypeName.trim(), emoji: newTypeEmoji });
      setForm(f => ({ ...f, type: newTypeName.trim() }));
      setNewTypeName('');
      setNewTypeEmoji('🚛');
      setAddingType(false);
    } catch (err) {
      setTypeError(err.message || 'Could not add type');
    }
  }

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fleet / Vehicles</div>
          <div className="page-subtitle">{vehicles.length} vehicles registered</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: isReadOnly ? 'none' : undefined }}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {['all','available','on-rent','maintenance'].map(s => {
          const count = s === 'all' ? vehicles.length : vehicles.filter(v => v.status === s).length;
          const labels = { all:'Total Fleet', available:'Available', 'on-rent':'On Rent', maintenance:'Maintenance' };
          const colors = { all:'#1e40af', available:'#059669', 'on-rent':'#2563eb', maintenance:'#dc2626' };
          const bgs    = { all:'#eff6ff', available:'#d1fae5', 'on-rent':'#dbeafe', maintenance:'#fee2e2' };
          return (
            <div key={s} className="stat-card" onClick={() => setFilter(s)} style={{ cursor:'pointer', outline: filter===s ? `2px solid ${colors[s]}` : 'none' }}>
              <div className="stat-icon" style={{ background: bgs[s] }}>
                <span style={{ fontSize:'1.4rem' }}>{ s==='all'?'🚛': s==='available'?'✅': s==='on-rent'?'🔵':'🔧' }</span>
              </div>
              <div className="stat-info">
                <h3 style={{ color: colors[s] }}>{count}</h3>
                <p>{labels[s]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Search by name or reg no..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="on-rent">On Rent</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Vehicle Grid */}
      <div className="grid-3">
        {filtered.map(v => (
          <div className="vehicle-card" key={v.id}>
            <div className="vehicle-card-header">
              <div>
                <div className="vehicle-icon-wrap" style={{ background: typeBgMap[v.type] || '#f8fafc' }}>
                  {v.emoji || typeEmojiMap[v.type] || '🚛'}
                </div>
              </div>
              <span className={`badge ${statusColors[v.status] || 'badge-gray'}`}>
                {v.status}
              </span>
            </div>
            <div className="vehicle-card-body">
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{v.type}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>{v.regNo} · {v.model}</div>
              <div className="vehicle-stat">
                <div className="vehicle-stat-item">
                  <h4>{fmt(v.dailyRate)}</h4>
                  <p>Daily Rate</p>
                </div>
                <div className="vehicle-stat-item">
                  <h4>{fmt(v.hourlyRate)}</h4>
                  <p>Hourly Rate</p>
                </div>
                <div className="vehicle-stat-item">
                  <h4>{v.year}</h4>
                  <p>Year</p>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#64748b' }}>
                👤 <strong>{v.driver || 'Not assigned'}</strong>
              </div>
            </div>
            <div className="vehicle-card-footer">
              {!isReadOnly && (
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(v)} style={{ flex:1 }}>
                  <Edit2 size={13} /> Edit
                </button>
              )}
              {!isReadOnly && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id)} style={{ flex:1 }}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
              {isReadOnly && (
                <div style={{ flex:1, textAlign:'center', fontSize:'0.8rem', color:'#94a3b8', padding:'6px 0' }}>Read-only</div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn:'1/-1' }}>
            <div style={{ fontSize:'3rem' }}>🚛</div>
            <p style={{ marginTop: 8 }}>No vehicles found.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Vehicle' : 'Add New Vehicle'}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Vehicle Type *</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setAddingType(true);
                    } else {
                      setForm({ ...form, type: e.target.value });
                    }
                  }}
                >
                  {(vehicleTypes || []).map(t => (
                    <option key={t.id} value={t.name}>{t.emoji} {t.name}</option>
                  ))}
                  <option value="__add_new__">➕ Add New Type…</option>
                </select>

                {/* Inline add-type form */}
                {addingType && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="form-input"
                        style={{ flex: 1, minWidth: 120 }}
                        placeholder="Type name, e.g. Crane"
                        value={newTypeName}
                        onChange={e => setNewTypeName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddType()}
                        autoFocus
                      />
                      <input
                        className="form-input"
                        style={{ width: 60, textAlign: 'center', fontSize: '1.2rem' }}
                        placeholder="🚛"
                        value={newTypeEmoji}
                        onChange={e => setNewTypeEmoji(e.target.value)}
                        maxLength={2}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleAddType}>Save</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingType(false); setTypeError(''); }}>
                        <X size={13} />
                      </button>
                    </div>
                    {typeError && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 4 }}>{typeError}</div>}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Reg. Number *</label>
                <input className="form-input" placeholder="TN01AB1234" value={form.regNo} onChange={e => setForm({...form, regNo: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Model *</label>
                <input className="form-input" placeholder="Tata LPT 1613" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input className="form-input" type="number" placeholder="2022" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Daily Rate (₹)</label>
                <input className="form-input" type="number" placeholder="4500" value={form.dailyRate} onChange={e => setForm({...form, dailyRate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Hourly Rate (₹)</label>
                <input className="form-input" type="number" placeholder="500" value={form.hourlyRate} onChange={e => setForm({...form, hourlyRate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="available">Available</option>
                  <option value="on-rent">On Rent</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Assigned Driver</label>
                <input className="form-input" placeholder="Driver name" value={form.driver} onChange={e => setForm({...form, driver: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Vehicle'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
