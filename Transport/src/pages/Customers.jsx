import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Edit2, Trash2, X, Eye } from 'lucide-react';

const emptyForm = { name:'', contact:'', phone:'', email:'', address:'', status:'active' };

export default function Customers() {
  const { customers, rentals, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [viewModal, setView]  = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);

  const filtered = customers.filter(c => {
    const m = search.toLowerCase();
    return c.name.toLowerCase().includes(m) || c.phone.includes(m) || (c.contact||'').toLowerCase().includes(m);
  });

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (c) => { setForm(c); setEditing(c.id); setModal(true); };

  const handleSave = () => {
    if (!form.name || !form.phone) return alert('Name and phone are required.');
    editing ? updateCustomer({ ...form, id: editing }) : addCustomer(form);
    setModal(false);
  };

  const getCustomerRentals = (name) => rentals.filter(r => r.customer.toLowerCase() === name.toLowerCase());

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const totalRevenue = customers.reduce((s,c) => s + (c.totalAmount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-subtitle">{customers.length} customers registered</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Customer</button>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label:'Total Customers', value: customers.length, bg:'#dbeafe', color:'#1e40af', icon:'👥' },
          { label:'Active', value: customers.filter(c=>c.status==='active').length, bg:'#d1fae5', color:'#059669', icon:'✅' },
          { label:'Total Revenue', value: fmt(totalRevenue), bg:'#fef3c7', color:'#d97706', icon:'💰' },
          { label:'Total Bookings', value: customers.reduce((s,c) => s+(c.totalRentals||0), 0), bg:'#f3e8ff', color:'#7c3aed', icon:'📋' },
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
          <input className="search-input" placeholder="Search customer, phone, contact..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Rentals</th>
              <th>Total Business</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i) => (
              <tr key={c.id}>
                <td style={{ color:'#94a3b8', fontSize:'0.78rem' }}>{i+1}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#1e40af', fontSize:'0.9rem' }}>
                      {c.name.charAt(0)}
                    </div>
                    <div style={{ fontWeight:600 }}>{c.name}</div>
                  </div>
                </td>
                <td style={{ fontSize:'0.875rem' }}>{c.contact || '—'}</td>
                <td style={{ fontSize:'0.875rem' }}>{c.phone}</td>
                <td style={{ fontSize:'0.82rem', color:'#64748b' }}>{c.address || '—'}</td>
                <td style={{ textAlign:'center', fontWeight:600 }}>{c.totalRentals || 0}</td>
                <td style={{ fontWeight:600, color:'#059669' }}>{fmt(c.totalAmount)}</td>
                <td><span className={`badge ${c.status==='active'?'badge-success':'badge-gray'}`}>{c.status}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="action-btn" onClick={() => setView(c)} title="View"><Eye size={13}/></button>
                    <button className="action-btn edit" onClick={() => openEdit(c)}><Edit2 size={13}/></button>
                    <button className="action-btn delete" onClick={() => { if(confirm('Delete customer?')) deleteCustomer(c.id); }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="empty-state">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Customer' : 'Add Customer'}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Company / Customer Name *</label>
                <input className="form-input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-input" placeholder="Contact person" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="City, State" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Customer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Customer Profile</span>
              <button className="close-btn" onClick={() => setView(null)}><X size={16}/></button>
            </div>
            <div style={{ background:'#eff6ff', borderRadius:10, padding:'16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:50, height:50, borderRadius:12, background:'#1e40af', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'1.3rem' }}>
                {viewModal.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'1.05rem' }}>{viewModal.name}</div>
                <div style={{ fontSize:'0.82rem', color:'#64748b', marginTop:2 }}>{viewModal.address}</div>
              </div>
            </div>
            {[
              ['Contact Person', viewModal.contact || '—'],
              ['Phone', viewModal.phone],
              ['Email', viewModal.email || '—'],
              ['Total Rentals', viewModal.totalRentals || 0],
              ['Total Business', fmt(viewModal.totalAmount)],
              ['Status', viewModal.status],
            ].map(([l,v]) => (
              <div key={l} className="info-row">
                <span className="info-label">{l}</span>
                <span className="info-value">{v}</span>
              </div>
            ))}

            {/* Rental history */}
            {(() => {
              const cRentals = getCustomerRentals(viewModal.name);
              return cRentals.length > 0 ? (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:8, color:'#1e293b' }}>Rental History</div>
                  {cRentals.map(r => (
                    <div key={r.id} style={{ padding:'8px 12px', background:'#f8fafc', borderRadius:8, marginBottom:6, fontSize:'0.82rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>{r.vehicleName}</span>
                        <span style={{ fontWeight:700, color:'#059669' }}>{fmt(r.totalAmount)}</span>
                      </div>
                      <div style={{ color:'#64748b', marginTop:2 }}>{r.startDate} → {r.endDate} · {r.days} days</div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            <div className="modal-footer" style={{ borderTop:'none', marginTop:12 }}>
              <button className="btn btn-secondary" onClick={() => setView(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setView(null); openEdit(viewModal); }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
