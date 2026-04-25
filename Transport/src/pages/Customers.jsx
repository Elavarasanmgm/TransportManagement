import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, Edit2, Trash2, X, Eye } from 'lucide-react';

const emptyForm = { name:'', contact:'', phone:'', email:'', address:'', status:'active' };

export default function Customers() {
  const { customers, rentals, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const txt = isTamil ? {
    title: 'வாடிக்கையாளர்கள்',
    subtitle: 'பதிவு செய்யப்பட்ட வாடிக்கையாளர்கள்',
    addCustomer: 'வாடிக்கையாளர் சேர்',
    totalCustomers: 'மொத்த வாடிக்கையாளர்கள்',
    active: 'செயலில்',
    totalRevenue: 'மொத்த வருவாய்',
    totalBookings: 'மொத்த பதிவுகள்',
    search: 'வாடிக்கையாளர், தொலைபேசி, தொடர்பு தேடு...',
    customer: 'வாடிக்கையாளர்',
    contactPerson: 'தொடர்பு நபர்',
    phone: 'தொலைபேசி',
    address: 'முகவரி',
    rentals: 'வாடகைகள்',
    totalBusiness: 'மொத்த வர்த்தகம்',
    status: 'நிலை',
    actions: 'செயல்கள்',
    noCustomers: 'வாடிக்கையாளர்கள் இல்லை.',
    editCustomer: 'வாடிக்கையாளர் திருத்து',
    customerProfile: 'வாடிக்கையாளர் சுயவிவரம்',
    companyCustomerName: 'நிறுவனம் / வாடிக்கையாளர் பெயர்',
    email: 'மின்னஞ்சல்',
    inactive: 'செயலற்றது',
    cancel: 'ரத்து',
    update: 'புதுப்பி',
    close: 'மூடு',
    edit: 'திருத்து',
    rentalHistory: 'வாடகை வரலாறு',
    namePhoneReq: 'பெயரும் தொலைபேசியும் தேவை.',
    deleteConfirm: 'வாடிக்கையாளரை நீக்கவா?',
  } : {
    title: 'Customers',
    subtitle: 'customers registered',
    addCustomer: 'Add Customer',
    totalCustomers: 'Total Customers',
    active: 'Active',
    totalRevenue: 'Total Revenue',
    totalBookings: 'Total Bookings',
    search: 'Search customer, phone, contact...',
    customer: 'Customer',
    contactPerson: 'Contact Person',
    phone: 'Phone',
    address: 'Address',
    rentals: 'Rentals',
    totalBusiness: 'Total Business',
    status: 'Status',
    actions: 'Actions',
    noCustomers: 'No customers found.',
    editCustomer: 'Edit Customer',
    customerProfile: 'Customer Profile',
    companyCustomerName: 'Company / Customer Name',
    email: 'Email',
    inactive: 'Inactive',
    cancel: 'Cancel',
    update: 'Update',
    close: 'Close',
    edit: 'Edit',
    rentalHistory: 'Rental History',
    namePhoneReq: 'Name and phone are required.',
    deleteConfirm: 'Delete customer?',
  };
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
    if (!form.name || !form.phone) return alert(txt.namePhoneReq);
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
          <div className="page-title">{txt.title}</div>
          <div className="page-subtitle">{customers.length} {txt.subtitle}</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> {txt.addCustomer}</button>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label:txt.totalCustomers, value: customers.length, bg:'#dbeafe', color:'#1e40af', icon:'👥' },
          { label:txt.active, value: customers.filter(c=>c.status==='active').length, bg:'#d1fae5', color:'#059669', icon:'✅' },
          { label:txt.totalRevenue, value: fmt(totalRevenue), bg:'#fef3c7', color:'#d97706', icon:'💰' },
          { label:txt.totalBookings, value: customers.reduce((s,c) => s+(c.totalRentals||0), 0), bg:'#f3e8ff', color:'#7c3aed', icon:'📋' },
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
          <input className="search-input" placeholder={txt.search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{txt.customer}</th>
              <th>{txt.contactPerson}</th>
              <th>{txt.phone}</th>
              <th>{txt.address}</th>
              <th>{txt.rentals}</th>
              <th>{txt.totalBusiness}</th>
              <th>{txt.status}</th>
              <th>{txt.actions}</th>
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
                    <button className="action-btn delete" onClick={() => { if(confirm(txt.deleteConfirm)) deleteCustomer(c.id); }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="empty-state">{txt.noCustomers}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? txt.editCustomer : txt.addCustomer}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.companyCustomerName} *</label>
                <input className="form-input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.contactPerson}</label>
                <input className="form-input" placeholder="Contact person" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.phone} *</label>
                <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.email}</label>
                <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.status}</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">{txt.active}</option>
                  <option value="inactive">{txt.inactive}</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.address}</label>
                <input className="form-input" placeholder="City, State" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{txt.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? txt.update : txt.addCustomer}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{txt.customerProfile}</span>
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
              [txt.contactPerson, viewModal.contact || '—'],
              [txt.phone, viewModal.phone],
              [txt.email, viewModal.email || '—'],
              [txt.rentals, viewModal.totalRentals || 0],
              [txt.totalBusiness, fmt(viewModal.totalAmount)],
              [txt.status, viewModal.status],
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
                  <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:8, color:'#1e293b' }}>{txt.rentalHistory}</div>
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
              <button className="btn btn-secondary" onClick={() => setView(null)}>{txt.close}</button>
              <button className="btn btn-primary" onClick={() => { setView(null); openEdit(viewModal); }}>{txt.edit}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
