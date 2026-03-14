import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Shield, User, Truck, UserCheck } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, getDrivers, getCustomers } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { username: '', fullName: '', password: '', confirmPassword: '', role: 'admin', driverId: '', customerId: '' };

const ROLE_COLORS = {
  admin:    { bg: '#dbeafe', color: '#1d4ed8' },
  driver:   { bg: '#d1fae5', color: '#059669' },
  customer: { bg: '#fef3c7', color: '#d97706' },
};

const ROLE_ICONS = { admin: Shield, driver: Truck, customer: UserCheck };

export default function Settings() {
  const { user: me } = useAuth();
  const [users,     setUsers]     = useState([]);
  const [drivers,   setDrivers]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(emptyForm);
  const [formErr, setFormErr] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, d, c] = await Promise.all([getUsers(), getDrivers(), getCustomers()]);
      setUsers(u);
      setDrivers(d);
      setCustomers(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setFormErr('');
    setModal(true);
  }

  function openEdit(u) {
    setForm({
      username:      u.Username    || u.username    || '',
      fullName:      u.FullName    || u.fullName    || '',
      password:      '',
      confirmPassword: '',
      role:          u.Role        || u.role        || 'admin',
      driverId:      u.DriverId    || u.driverId    || '',
      customerId:    u.CustomerId  || u.customerId  || '',
    });
    setEditing(u.Id || u.id);
    setFormErr('');
    setModal(true);
  }

  async function handleSave() {
    setFormErr('');
    if (!form.username.trim()) return setFormErr('Username is required');
    if (!editing && !form.password) return setFormErr('Password is required for new users');
    if (form.password && form.password.length < 6) return setFormErr('Password must be at least 6 characters');
    if (form.password && form.password !== form.confirmPassword) return setFormErr('Passwords do not match');
    if (form.role === 'driver'   && !form.driverId)   return setFormErr('Please select the linked driver record');
    if (form.role === 'customer' && !form.customerId) return setFormErr('Please select the linked customer record');

    const payload = {
      fullName:   form.fullName,
      role:       form.role,
      driverId:   form.role === 'driver'   ? Number(form.driverId)   : null,
      customerId: form.role === 'customer' ? Number(form.customerId) : null,
    };
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateUser(editing, payload);
        setUsers(prev => prev.map(u => (u.Id || u.id) === editing ? updated : u));
      } else {
        const created = await createUser({ username: form.username, ...payload });
        setUsers(prev => [...prev, created]);
      }
      setModal(false);
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u) {
    const name = u.FullName || u.fullName || u.Username || u.username;
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(u.Id || u.id);
      setUsers(prev => prev.filter(x => (x.Id || x.id) !== (u.Id || u.id)));
    } catch (err) {
      alert(err.message);
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage system users and access</div>
        </div>
      </div>

      {/* Users section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>User Accounts</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>Add, edit or remove login accounts</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add User
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading users...</div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#dc2626' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Linked To</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const uid      = u.Id       || u.id;
                const uname    = u.Username  || u.username;
                const fname    = u.FullName  || u.fullName || '-';
                const role     = u.Role      || u.role;
                const created  = u.CreatedAt || u.createdAt;
                const dId      = u.DriverId   || u.driverId;
                const cId      = u.CustomerId || u.customerId;
                const isSelf   = uid === (me?.id);
                const rc       = ROLE_COLORS[role] || ROLE_COLORS.admin;
                const RIcon    = ROLE_ICONS[role]  || User;

                // Linked record label
                let linkedLabel = '-';
                if (role === 'driver'   && dId) {
                  const d = drivers.find(x => (x.Id || x.id) === dId);
                  linkedLabel = d ? (d.Name || d.name) : `Driver #${dId}`;
                } else if (role === 'customer' && cId) {
                  const c = customers.find(x => (x.Id || x.id) === cId);
                  linkedLabel = c ? (c.Name || c.name) : `Customer #${cId}`;
                }

                return (
                  <tr key={uid}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background: rc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:700, color: rc.color }}>
                          {fname.charAt(0) || uname.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{fname}</span>
                        {isSelf && <span style={{ fontSize:'0.7rem', background:'#dcfce7', color:'#16a34a', padding:'1px 7px', borderRadius:99, fontWeight:600 }}>You</span>}
                      </div>
                    </td>
                    <td style={{ color:'#475569' }}>{uname}</td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.78rem', fontWeight:600, padding:'2px 10px', borderRadius:99, background: rc.bg, color: rc.color }}>
                        <RIcon size={11}/> {role}
                      </span>
                    </td>
                    <td style={{ color:'#475569', fontSize:'0.82rem' }}>{linkedLabel}</td>
                    <td style={{ color:'#64748b', fontSize:'0.82rem' }}>
                      {created ? new Date(created).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="action-btn edit" onClick={() => openEdit(u)} title="Edit"><Edit2 size={14}/></button>
                        <button className="action-btn delete" onClick={() => handleDelete(u)} title="Delete" disabled={isSelf}
                          style={{ opacity: isSelf ? 0.35 : 1, cursor: isSelf ? 'not-allowed':'pointer' }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'#94a3b8', padding:32 }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit User' : 'Add New User'}</span>
              <button className="close-btn" onClick={() => setModal(false)}><X size={16}/></button>
            </div>

            {formErr && <div className="auth-error" style={{ margin:'0 0 16px' }}>{formErr}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Username {!editing && <span style={{color:'#dc2626'}}>*</span>}</label>
                <input className="form-input" placeholder="Login username" {...field('username')} disabled={!!editing} />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Display name" {...field('fullName')} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" {...field('role')}>
                  <option value="admin">Admin - Full access</option>
                  <option value="driver">Driver - Fleet, Rentals, own records</option>
                  <option value="customer">Customer - Rentals &amp; own profile</option>
                </select>
              </div>

              {form.role === 'driver' && (
                <div className="form-group">
                  <label className="form-label">Linked Driver Record <span style={{color:'#dc2626'}}>*</span></label>
                  <select className="form-input" value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}>
                    <option value="">-- Select driver --</option>
                    {drivers.map(d => (
                      <option key={d.Id || d.id} value={d.Id || d.id}>{d.Name || d.name} ({d.Phone || d.phone || ''})</option>
                    ))}
                  </select>
                </div>
              )}

              {form.role === 'customer' && (
                <div className="form-group">
                  <label className="form-label">Linked Customer Record <span style={{color:'#dc2626'}}>*</span></label>
                  <select className="form-input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                    <option value="">-- Select customer --</option>
                    {customers.map(c => (
                      <option key={c.Id || c.id} value={c.Id || c.id}>{c.Name || c.name} ({c.Phone || c.phone || ''})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{editing ? 'New Password' : 'Password'} {!editing && <span style={{color:'#dc2626'}}>*</span>}</label>
                <input className="form-input" type="password" placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} {...field('password')} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Repeat password" {...field('confirmPassword')} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update User' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
