import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const CATEGORIES = ['Fuel', 'Maintenance', 'Repair', 'Insurance', 'Tyres', 'Salary', 'Other'];
const PAID_BY    = ['Cash', 'Account', 'UPI', 'Cheque'];

const emptyForm = { vehicleId:'', vehicleName:'', category:'Fuel', amount:'', date:'', description:'', paidBy:'Cash' };

const catColors = { Fuel:'badge-warning', Maintenance:'badge-info', Repair:'badge-danger', Insurance:'badge-success', Tyres:'badge-gray', Salary:'badge-info', Other:'badge-gray' };

export default function Expenses() {
  const { expenses, vehicles, addExpense, updateExpense, deleteExpense } = useApp();
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const txt = isTamil ? {
    title: 'செலவுகள்',
    total: 'மொத்தம்',
    across: 'பதிவுகள்',
    addExpense: 'செலவு சேர்க்க',
    search: 'வாகனம், வகை, விளக்கம் தேடு...',
    allCategories: 'அனைத்து வகைகள்',
    date: 'தேதி',
    vehicle: 'வாகனம்',
    category: 'வகை',
    description: 'விளக்கம்',
    amount: 'தொகை',
    paidBy: 'செலுத்தியது',
    actions: 'செயல்கள்',
    noExpenses: 'செலவு பதிவுகள் இல்லை.',
    editExpense: 'செலவு திருத்து',
    amountDateRequired: 'தொகை மற்றும் தேதி அவசியம்.',
    cancel: 'ரத்து',
    save: 'சேமி',
    update: 'புதுப்பி',
    generalNoVehicle: 'பொது / வாகனம் இல்லை',
    brief: 'சுருக்கமான விளக்கம்...',
    deleteConfirm: 'நீக்கவா?',
  } : {
    title: 'Expenses',
    total: 'Total',
    across: 'records',
    addExpense: 'Add Expense',
    search: 'Search vehicle, category, description...',
    allCategories: 'All Categories',
    date: 'Date',
    vehicle: 'Vehicle',
    category: 'Category',
    description: 'Description',
    amount: 'Amount',
    paidBy: 'Paid By',
    actions: 'Actions',
    noExpenses: 'No expenses found.',
    editExpense: 'Edit Expense',
    amountDateRequired: 'Amount and date are required.',
    cancel: 'Cancel',
    save: 'Save',
    update: 'Update',
    generalNoVehicle: 'General / No Vehicle',
    brief: 'Brief description...',
    deleteConfirm: 'Delete?',
  };
  const [search, setSearch]   = useState('');
  const [catFilter, setCat]   = useState('all');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);

  const filtered = expenses.filter(e => {
    const m = search.toLowerCase();
    const matchS = e.vehicleName.toLowerCase().includes(m) || e.description.toLowerCase().includes(m) || e.category.toLowerCase().includes(m);
    const matchC = catFilter === 'all' || e.category === catFilter;
    return matchS && matchC;
  });

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (e) => { setForm({ ...e, date: String(e.expenseDate || e.date || '').slice(0, 10) }); setEditing(e.id); setModal(true); };

  const handleVehicle = (id) => {
    const v = vehicles.find(v => v.id === Number(id));
    setForm(f => ({ ...f, vehicleId: v ? v.id : '', vehicleName: v ? v.name : '' }));
  };

  const handleSave = () => {
    if (!form.amount || !form.date) return alert(txt.amountDateRequired);
    const payload = { ...form, amount: Number(form.amount) };
    editing ? updateExpense({ ...payload, id: editing }) : addExpense(payload);
    setModal(false);
  };

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  const totalByCategory = CATEGORIES.reduce((acc, c) => {
    acc[c] = expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{txt.title}</div>
          <div className="page-subtitle">{txt.total}: {fmt(grandTotal)} {expenses.length} {txt.across}</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> {txt.addExpense}</button>
      </div>

      {/* Category summary */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[['Fuel','⛽','#fef3c7','#d97706'],['Maintenance','🔧','#dbeafe','#1e40af'],['Repair','🔨','#fee2e2','#dc2626'],['Insurance','🛡️','#d1fae5','#059669']].map(([c, icon, bg, color]) => (
          <div key={c} className="stat-card" onClick={() => setCat(catFilter===c?'all':c)} style={{ cursor:'pointer', outline: catFilter===c ? `2px solid ${color}` : 'none' }}>
            <div className="stat-icon" style={{ background: bg }}><span style={{ fontSize:'1.3rem' }}>{icon}</span></div>
            <div className="stat-info">
              <h3 style={{ color }}>{fmt(totalByCategory[c])}</h3>
              <p>{c}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder={txt.search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width:160 }} value={catFilter} onChange={e => setCat(e.target.value)}>
          <option value="all">{txt.allCategories}</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{txt.date}</th>
              <th>{txt.vehicle}</th>
              <th>{txt.category}</th>
              <th>{txt.description}</th>
              <th>{txt.amount}</th>
              <th>{txt.paidBy}</th>
              <th>{txt.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id}>
                <td style={{ color:'#94a3b8', fontSize:'0.78rem' }}>{i+1}</td>
                <td style={{ fontSize:'0.85rem' }}>{String(e.expenseDate || e.date || '').slice(0, 10)}</td>
                <td>{e.vehicleName || <span style={{ color:'#94a3b8' }}>—</span>}</td>
                <td><span className={`badge ${catColors[e.category]||'badge-gray'}`}>{e.category}</span></td>
                <td style={{ color:'#475569' }}>{e.description || '—'}</td>
                <td><strong style={{ color:'#dc2626' }}>{fmt(e.amount)}</strong></td>
                <td style={{ fontSize:'0.82rem' }}>{e.paidBy}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="action-btn edit" onClick={() => openEdit(e)}><Edit2 size={13}/></button>
                    <button className="action-btn delete" onClick={() => { if(confirm(txt.deleteConfirm)) deleteExpense(e.id); }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">{txt.noExpenses}</td></tr>}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{ padding:'12px 16px', fontWeight:700, background:'#f8fafc', fontSize:'0.875rem' }}>{txt.total}</td>
                <td style={{ padding:'12px 16px', fontWeight:700, color:'#dc2626', background:'#f8fafc' }}>
                  {fmt(filtered.reduce((s,e) => s+e.amount, 0))}
                </td>
                <td colSpan={2} style={{ background:'#f8fafc' }}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? txt.editExpense : txt.addExpense}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{txt.vehicle}</label>
                <select className="form-input" value={form.vehicleId} onChange={e => handleVehicle(e.target.value)}>
                  <option value="">{txt.generalNoVehicle}</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{txt.category} *</label>
                <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{txt.amount} (₹) *</label>
                <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.date} *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">{txt.paidBy}</label>
                <select className="form-input" value={form.paidBy} onChange={e => setForm({...form, paidBy: e.target.value})}>
                  {PAID_BY.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">{txt.description}</label>
                <input className="form-input" placeholder={txt.brief} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
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
