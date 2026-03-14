import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const emptyForm = { name:'', phone:'', licenseNo:'', licenseType:'LMV', vehicleId:'', vehicleName:'', joinDate:'', salary:'', advance:'', status:'active' };

export default function Drivers() {
  const { drivers, vehicles, addDriver, updateDriver, deleteDriver } = useApp();
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);

  const filtered = drivers.filter(d => {
    const m = search.toLowerCase();
    return d.name.toLowerCase().includes(m) || d.phone.includes(m) || d.licenseNo.toLowerCase().includes(m);
  });

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (d) => { setForm(d); setEditing(d.id); setModal(true); };

  const handleVehicle = (id) => {
    const v = vehicles.find(v => v.id === Number(id));
    setForm(f => ({ ...f, vehicleId: v ? v.id : '', vehicleName: v ? v.name : '' }));
  };

  const handleSave = () => {
    if (!form.name || !form.phone) return alert('Name and phone are required.');
    const payload = { ...form, salary: Number(form.salary), advance: Number(form.advance || 0) };
    editing ? updateDriver({ ...payload, id: editing }) : addDriver(payload);
    setModal(false);
  };

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Drivers</div>
          <div className="page-subtitle">{drivers.length} drivers registered</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Driver</button>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label:'Total Drivers', value: drivers.length, bg:'#dbeafe', color:'#1e40af', icon:'👥' },
          { label:'Active', value: drivers.filter(d=>d.status==='active').length, bg:'#d1fae5', color:'#059669', icon:'✅' },
          { label:'Total Salary/Month', value: fmt(drivers.reduce((s,d) => s+(d.salary||0), 0)), bg:'#fef3c7', color:'#d97706', icon:'💰' },
          { label:'Total Advance Given', value: fmt(drivers.reduce((s,d) => s+(d.advance||0), 0)), bg:'#fee2e2', color:'#dc2626', icon:'�' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize:'1.3rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <h3 style={{ color: s.color, fontSize: typeof s.value === 'string' && s.value.length > 8 ? '1rem':'1.7rem' }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Search name, phone, license..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Driver</th>
              <th>License</th>
              <th>Assigned Vehicle</th>
              <th>Join Date</th>
              <th>Salary</th>
              <th>Advance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d,i) => (
              <tr key={d.id}>
                <td style={{ color:'#94a3b8', fontSize:'0.78rem' }}>{i+1}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#1e40af', fontSize:'0.9rem' }}>
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight:600 }}>{d.name}</div>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{d.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize:'0.85rem' }}>{d.licenseNo}</div>
                  <span className={`badge ${d.licenseType==='HMV'?'badge-info':'badge-gray'}`}>{d.licenseType}</span>
                </td>
                <td style={{ fontSize:'0.875rem' }}>{d.vehicleName || <span style={{ color:'#94a3b8' }}>Not assigned</span>}</td>
                <td style={{ fontSize:'0.85rem' }}>{d.joinDate || '—'}</td>
                <td style={{ fontWeight:600 }}>{fmt(d.salary)}/mo</td>
                <td>
                  {d.advance > 0
                    ? <span style={{ fontWeight:600, color:'#dc2626' }}>{fmt(d.advance)}</span>
                    : <span style={{ color:'#94a3b8' }}>—</span>
                  }
                </td>
                <td><span className={`badge ${d.status==='active'?'badge-success':'badge-danger'}`}>{d.status}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="action-btn edit" onClick={() => openEdit(d)}><Edit2 size={13}/></button>
                    <button className="action-btn delete" onClick={() => { if(confirm('Delete driver?')) deleteDriver(d.id); }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="empty-state">No drivers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Driver' : 'Add Driver'}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Driver name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input className="form-input" placeholder="TN-01..." value={form.licenseNo} onChange={e => setForm({...form, licenseNo: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">License Type</label>
                <select className="form-input" value={form.licenseType} onChange={e => setForm({...form, licenseType: e.target.value})}>
                  <option>LMV</option>
                  <option>HMV</option>
                  <option>HGMV</option>
                  <option>MCWG</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Vehicle</label>
                <select className="form-input" value={form.vehicleId} onChange={e => handleVehicle(e.target.value)}>
                  <option value="">Not assigned</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Salary (₹)</label>
                <input className="form-input" type="number" placeholder="15000" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Advance Given (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={form.advance} onChange={e => setForm({...form, advance: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input className="form-input" type="date" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-leave">On Leave</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Driver'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
