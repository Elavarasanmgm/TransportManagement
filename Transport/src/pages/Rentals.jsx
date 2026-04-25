import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, Edit2, Trash2, X, Eye } from 'lucide-react';

const emptyForm = {
  vehicleId:'', vehicleName:'', customer:'', phone:'', startDate:'', endDate:'',
  rateType:'daily', days:1, dailyRate:'', hourlyRate:'', hours:0,
  totalAmount:0, discount:0, advancePaid:0, balance:0, purpose:'', status:'active'
};

export default function Rentals() {
  const { rentals, vehicles, customers, addRental, updateRental, deleteRental, addCustomer } = useApp();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const txt = isTamil ? {
    rentalBookings: 'வாடகை பதிவுகள்',
    totalBookings: 'மொத்த பதிவுகள்',
    newBooking: 'புதிய பதிவு',
    totalRevenue: 'மொத்த வருவாய்',
    pendingBalance: 'நிலுவைத் தொகை',
    activeRentals: 'செயலில் உள்ள வாடகைகள்',
    completed: 'முடிந்தவை',
    searchPlaceholder: 'வாடிக்கையாளர், வாகனம் தேடு...',
    allStatus: 'அனைத்து நிலைகள்',
    statusActive: 'செயலில்',
    statusCompleted: 'முடிந்தது',
    statusCancelled: 'ரத்து',
    noRentals: 'வாடகை பதிவுகள் இல்லை.',
    bookingModalTitleNew: 'புதிய வாடகை பதிவு',
    bookingModalTitleEdit: 'வாடகை பதிவை திருத்து',
    customerName: 'வாடிக்கையாளர் பெயர்',
    phone: 'தொலைபேசி',
    vehicle: 'வாகனம்',
    selectVehicle: 'வாகனத்தை தேர்வு செய்க',
    purpose: 'பயன்பாட்டு காரணம்',
    purposePlaceholder: 'வாடகை நோக்கம்',
    startDate: 'தொடக்க தேதி',
    endDate: 'முடிவு தேதி',
    rateType: 'கட்டண வகை',
    daily: 'தினசரி',
    hourly: 'மணிநேர',
    dailyRate: 'தினசரி கட்டணம் (ரூ)',
    hourlyRate: 'மணிநேர கட்டணம் (ரூ)',
    days: 'நாட்கள்',
    hours: 'மணிநேரங்கள்',
    grossAmount: 'மொத்த தொகை (ரூ)',
    discount: 'தள்ளுபடி (ரூ)',
    advancePaid: 'முன்பணம் (ரூ)',
    balance: 'நிலுவை (ரூ)',
    status: 'நிலை',
    cancel: 'ரத்து',
    saveBooking: 'பதிவு சேமி',
    update: 'புதுப்பி',
    close: 'மூடு',
    edit: 'திருத்து',
    addCustomer: 'வாடிக்கையாளர் சேர்க்க',
    addNewCustomer: 'புதிய வாடிக்கையாளர் சேர்க்க',
    companyCustomerName: 'நிறுவனம் / வாடிக்கையாளர் பெயர்',
    contactPerson: 'தொடர்பு நபர்',
    email: 'மின்னஞ்சல்',
    address: 'முகவரி',
    active: 'செயலில்',
    inactive: 'செயலற்றது',
    viewDetails: 'வாடகை விவரங்கள்',
  } : {
    rentalBookings: 'Rental Bookings',
    totalBookings: 'total bookings',
    newBooking: 'New Booking',
    totalRevenue: 'Total Revenue',
    pendingBalance: 'Pending Balance',
    activeRentals: 'Active Rentals',
    completed: 'Completed',
    searchPlaceholder: 'Search customer, vehicle...',
    allStatus: 'All Status',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    noRentals: 'No rentals found.',
    bookingModalTitleNew: 'New Rental Booking',
    bookingModalTitleEdit: 'Edit Booking',
    customerName: 'Customer Name',
    phone: 'Phone',
    vehicle: 'Vehicle',
    selectVehicle: 'Select vehicle',
    purpose: 'Purpose',
    purposePlaceholder: 'Purpose of rental',
    startDate: 'Start Date',
    endDate: 'End Date',
    rateType: 'Rate Type',
    daily: 'Daily',
    hourly: 'Hourly',
    dailyRate: 'Daily Rate (₹)',
    hourlyRate: 'Hourly Rate (₹)',
    days: 'Days',
    hours: 'Hours',
    grossAmount: 'Gross Amount (₹)',
    discount: 'Discount (₹)',
    advancePaid: 'Advance Paid (₹)',
    balance: 'Balance (₹)',
    status: 'Status',
    cancel: 'Cancel',
    saveBooking: 'Save Booking',
    update: 'Update',
    close: 'Close',
    edit: 'Edit',
    addCustomer: 'Add Customer',
    addNewCustomer: 'Add New Customer',
    companyCustomerName: 'Company / Customer Name',
    contactPerson: 'Contact Person',
    email: 'Email',
    address: 'Address',
    active: 'Active',
    inactive: 'Inactive',
    viewDetails: 'Rental Details',
  };
  const isReadOnly = user?.role === 'driver' || user?.role === 'customer';
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const [modal, setModal]     = useState(false);
  const [viewModal, setView]  = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);
  const [custSearch, setCustSearch]     = useState('');
  const [custOpen, setCustOpen]         = useState(false);
  const [addCustModal, setAddCustModal] = useState(false);
  const [custForm, setCustForm]         = useState({ name:'', contact:'', phone:'', email:'', address:'', status:'active' });

  const filtered = rentals.filter(r => {
    const m = search.toLowerCase();
    const matchS = r.customer.toLowerCase().includes(m) || r.vehicleName.toLowerCase().includes(m) || r.phone.includes(m);
    const matchF = filter === 'all' || r.status === filter;
    return matchS && matchF;
  });

  const openAdd = () => { setForm(emptyForm); setEditing(null); setCustSearch(''); setModal(true); };
  const openEdit = (r) => { setForm(r); setEditing(r.id); setCustSearch(r.customer || ''); setModal(true); };

  const handleSaveNewCustomer = async () => {
    if (!custForm.name || !custForm.phone) return alert('Name and phone are required.');
    const saved = await addCustomer(custForm);
    setForm(f => ({ ...f, customer: saved.name, phone: saved.phone || f.phone }));
    setCustSearch(saved.name);
    setAddCustModal(false);
  };

  const handleVehicleChange = (id) => {
    const v = vehicles.find(v => v.id === Number(id));
    if (v) setForm(f => ({ ...f, vehicleId: v.id, vehicleName: v.name, dailyRate: v.dailyRate, hourlyRate: v.hourlyRate || 0 }));
  };

  const calcDays = (start, end) => {
    if (!start || !end) return 1;
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 1;
  };

  const handleDateChange = (field, val) => {
    const updated = { ...form, [field]: val };
    const days = calcDays(field === 'startDate' ? val : form.startDate, field === 'endDate' ? val : form.endDate);
    const gross = days * Number(updated.dailyRate || 0);
    const balance = gross - Number(updated.discount || 0) - Number(updated.advancePaid || 0);
    setForm({ ...updated, days, totalAmount: gross, balance });
  };

  const handleDailyRateChange = (val) => {
    const gross = form.days * Number(val);
    const balance = gross - Number(form.discount || 0) - Number(form.advancePaid || 0);
    setForm({ ...form, dailyRate: val, totalAmount: gross, balance });
  };

  const handleHourlyRateChange = (val) => {
    const gross = Number(form.hours || 0) * Number(val);
    const balance = gross - Number(form.discount || 0) - Number(form.advancePaid || 0);
    setForm({ ...form, hourlyRate: val, totalAmount: gross, balance });
  };

  const handleHoursChange = (val) => {
    const gross = Number(val) * Number(form.hourlyRate || 0);
    const balance = gross - Number(form.discount || 0) - Number(form.advancePaid || 0);
    setForm({ ...form, hours: Number(val), totalAmount: gross, balance });
  };

  const handleRateTypeChange = (val) => {
    const gross = val === 'hourly'
      ? Number(form.hours || 0) * Number(form.hourlyRate || 0)
      : Number(form.days || 1) * Number(form.dailyRate || 0);
    const balance = gross - Number(form.discount || 0) - Number(form.advancePaid || 0);
    setForm({ ...form, rateType: val, totalAmount: gross, balance });
  };

  const handleAdvanceChange = (val) => {
    const balance = form.totalAmount - Number(form.discount || 0) - Number(val);
    setForm({ ...form, advancePaid: Number(val), balance });
  };

  const handleDiscountChange = (val) => {
    const balance = form.totalAmount - Number(val) - Number(form.advancePaid || 0);
    setForm({ ...form, discount: Number(val), balance });
  };

  const handleSave = () => {
    if (!form.customer || !form.vehicleId) return alert('Customer and vehicle are required.');
    editing ? updateRental({ ...form, id: editing }) : addRental(form);
    setModal(false);
  };

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  const totalRevenue  = rentals.reduce((s, r) => s + r.totalAmount, 0);
  const totalBalance  = rentals.reduce((s, r) => s + r.balance, 0);
  const activeCount   = rentals.filter(r => r.status === 'active').length;
  const completedCount= rentals.filter(r => r.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{txt.rentalBookings}</div>
          <div className="page-subtitle">{rentals.length} {txt.totalBookings}</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: user?.role === 'customer' ? 'none' : undefined }}><Plus size={16} /> {txt.newBooking}</button>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label:txt.totalRevenue, value: fmt(totalRevenue), bg:'#dbeafe', color:'#1e40af', hide: isReadOnly },
          { label:txt.pendingBalance, value: fmt(totalBalance), bg:'#fee2e2', color:'#dc2626', hide: isReadOnly },
          { label:txt.activeRentals, value: activeCount, bg:'#d1fae5', color:'#059669', hide: false },
          { label:txt.completed, value: completedCount, bg:'#fef3c7', color:'#d97706', hide: false },
        ].filter(s => !s.hide).map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize:'1.4rem' }}>{['💰','📋','🔵','✅'][i]}</span>
            </div>
            <div className="stat-info">
              <h3 style={{ color: s.color, fontSize: typeof s.value === 'string' && s.value.length > 8 ? '1.1rem':'1.7rem' }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder={txt.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">{txt.allStatus}</option>
          <option value="active">{txt.statusActive}</option>
          <option value="completed">{txt.statusCompleted}</option>
          <option value="cancelled">{txt.statusCancelled}</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Advance</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id}>
                <td style={{ color:'#94a3b8', fontSize:'0.8rem' }}>{i+1}</td>
                <td>
                  <div style={{ fontWeight:600 }}>{r.customer}</div>
                  <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{r.phone}</div>
                </td>
                <td style={{ fontSize:'0.875rem' }}>{r.vehicleName}</td>
                <td style={{ fontSize:'0.8rem' }}>
                  {r.startDate} → {r.endDate}
                  <div style={{ color:'#64748b' }}>
                    {r.rateType === 'hourly'
                      ? `${r.hours} hrs @ ${fmt(r.hourlyRate)}/hr`
                      : `${r.days} days @ ${fmt(r.dailyRate)}/day`}
                  </div>
                </td>
                <td><strong>{fmt(r.totalAmount)}</strong></td>
                <td style={{ color:'#059669' }}>{fmt(r.advancePaid)}</td>
                <td style={{ color: r.balance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>{fmt(r.balance)}</td>
                <td>
                  <span className={`badge ${r.status==='active'?'badge-info':r.status==='completed'?'badge-success':'badge-danger'}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap: 6 }}>
                    <button className="action-btn" onClick={() => setView(r)} title="View"><Eye size={13} /></button>
                    {user?.role !== 'customer' && <button className="action-btn edit" onClick={() => openEdit(r)} title="Edit"><Edit2 size={13} /></button>}
                    {user?.role === 'admin' && <button className="action-btn delete" onClick={() => { if(confirm('Delete?')) deleteRental(r.id); }} title="Delete"><Trash2 size={13} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="empty-state">{txt.noRentals}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editing ? txt.bookingModalTitleEdit : txt.bookingModalTitleNew}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ position:'relative' }}>
                <label className="form-label">{txt.customerName} *</label>
                <input
                  className="form-input"
                  placeholder={isTamil ? 'தட்டச்சு செய்யவும் அல்லது தேர்வு செய்யவும்...' : 'Type or select customer...'}
                  value={custSearch}
                  autoComplete="off"
                  onFocus={() => setCustOpen(true)}
                  onChange={e => { setCustSearch(e.target.value); setCustOpen(true); setForm(f => ({...f, customer: e.target.value})); }}
                  onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                />
                {custOpen && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:999, background:'#fff', border:'1px solid #cbd5e1', borderRadius:8, maxHeight:200, overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.13)' }}>
                    {customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())).map(c => (
                      <div key={c.id}
                        onMouseDown={() => { setForm(f => ({...f, customer: c.name, phone: c.phone || f.phone})); setCustSearch(c.name); setCustOpen(false); }}
                        style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', fontSize:'0.9rem' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}
                      >{c.name}</div>
                    ))}
                    <div
                      onMouseDown={() => { setCustOpen(false); setCustForm({name:'',contact:'',phone:'',email:'',address:'',status:'active'}); setAddCustModal(true); }}
                      style={{ padding:'8px 12px', cursor:'pointer', color:'#2563eb', fontWeight:600, borderTop:'1px solid #e2e8f0', fontSize:'0.9rem' }}
                      onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}
                    >+ {txt.addNewCustomer}</div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{txt.phone}</label>
                <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.vehicle} *</label>
                <select className="form-input" value={form.vehicleId} onChange={e => handleVehicleChange(e.target.value)}>
                  <option value="">{txt.selectVehicle}</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{txt.purpose}</label>
                <input className="form-input" placeholder={txt.purposePlaceholder} value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.startDate} *</label>
                <input className="form-input" type="date" value={form.startDate} onChange={e => handleDateChange('startDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.endDate} *</label>
                <input className="form-input" type="date" value={form.endDate} onChange={e => handleDateChange('endDate', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.rateType}</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['daily','hourly'].map(t => (
                    <button key={t} type="button" onClick={() => handleRateTypeChange(t)}
                      style={{ padding:'7px 22px', borderRadius:8, border:'1.5px solid', cursor:'pointer',
                        borderColor: form.rateType===t ? '#2563eb':'#cbd5e1',
                        background: form.rateType===t ? '#2563eb':'#fff',
                        color: form.rateType===t ? '#fff':'#64748b', fontWeight:600, fontSize:'0.85rem' }}>
                      {t === 'daily' ? `📅 ${txt.daily}` : `⏱ ${txt.hourly}`}
                    </button>
                  ))}
                </div>
              </div>
              {form.rateType === 'daily' ? (<>
                <div className="form-group">
                  <label className="form-label">{txt.dailyRate}</label>
                  <input className="form-input" type="number" value={form.dailyRate} onChange={e => handleDailyRateChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{txt.days}</label>
                  <input className="form-input" type="number" value={form.days} readOnly style={{ background:'#f8fafc' }} />
                </div>
              </>) : (<>
                <div className="form-group">
                  <label className="form-label">{txt.hourlyRate}</label>
                  <input className="form-input" type="number" value={form.hourlyRate} onChange={e => handleHourlyRateChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{txt.hours}</label>
                  <input className="form-input" type="number" placeholder="e.g. 4" value={form.hours} onChange={e => handleHoursChange(e.target.value)} />
                </div>
              </>)}
              <div className="form-group">
                <label className="form-label">{txt.grossAmount}</label>
                <input className="form-input" type="number" value={form.totalAmount} readOnly style={{ background:'#f8fafc', fontWeight:700 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.discount}</label>
                <input className="form-input" type="number" placeholder="0" value={form.discount} onChange={e => handleDiscountChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.advancePaid}</label>
                <input className="form-input" type="number" value={form.advancePaid} onChange={e => handleAdvanceChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.balance}</label>
                <input className="form-input" type="number" value={form.balance} readOnly style={{ background:'#f8fafc', color:'#dc2626', fontWeight:700 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.status}</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">{txt.statusActive}</option>
                  <option value="completed">{txt.statusCompleted}</option>
                  <option value="cancelled">{txt.statusCancelled}</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{txt.cancel}</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? txt.update : txt.saveBooking}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{txt.viewDetails}</span>
              <button className="close-btn" onClick={() => setView(null)}><X size={16}/></button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:'1rem' }}>{viewModal.customer}</div>
              <div style={{ fontSize:'0.82rem', color:'#64748b' }}>{viewModal.phone}</div>
            </div>
            {[
              ['Vehicle', viewModal.vehicleName],
              ['Purpose', viewModal.purpose || '-'],
              ['Start Date', viewModal.startDate],
              ['End Date', viewModal.endDate],
              ['Duration', viewModal.rateType === 'hourly' ? `${viewModal.hours} hours` : `${viewModal.days} days`],
              ['Rate', viewModal.rateType === 'hourly' ? `${fmt(viewModal.hourlyRate)}/hr` : `${fmt(viewModal.dailyRate)}/day`],
              ['Gross Amount', fmt(viewModal.totalAmount)],
              ['Discount', fmt(viewModal.discount || 0)],
              ['Net Payable', fmt(viewModal.totalAmount - (viewModal.discount || 0))],
              ['Advance Paid', fmt(viewModal.advancePaid)],
              ['Balance Due', fmt(viewModal.balance)],
              ['Status', viewModal.status],
            ].map(([l,v]) => (
              <div key={l} className="info-row">
                <span className="info-label">{l}</span>
                <span className="info-value">{v}</span>
              </div>
            ))}
            <div className="modal-footer" style={{ borderTop:'none', marginTop:8 }}>
              <button className="btn btn-secondary" onClick={() => setView(null)}>{txt.close}</button>
              {user?.role !== 'customer' && <button className="btn btn-primary" onClick={() => { setView(null); openEdit(viewModal); }}>{txt.edit}</button>}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addCustModal && (
        <div className="modal-overlay" style={{ zIndex:1100 }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{txt.addCustomer}</span>
              <button className="close-btn" onClick={() => setAddCustModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.companyCustomerName} *</label>
                <input className="form-input" placeholder="Name" value={custForm.name} onChange={e => setCustForm({...custForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.contactPerson}</label>
                <input className="form-input" placeholder="Contact person" value={custForm.contact} onChange={e => setCustForm({...custForm, contact: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.phone} *</label>
                <input className="form-input" placeholder="9876543210" value={custForm.phone} onChange={e => setCustForm({...custForm, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.email}</label>
                <input className="form-input" type="email" placeholder="email@example.com" value={custForm.email} onChange={e => setCustForm({...custForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.status}</label>
                <select className="form-input" value={custForm.status} onChange={e => setCustForm({...custForm, status: e.target.value})}>
                  <option value="active">{txt.active}</option>
                  <option value="inactive">{txt.inactive}</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.address}</label>
                <input className="form-input" placeholder="City, State" value={custForm.address} onChange={e => setCustForm({...custForm, address: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddCustModal(false)}>{txt.cancel}</button>
              <button className="btn btn-primary" onClick={handleSaveNewCustomer}>{txt.addCustomer}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
