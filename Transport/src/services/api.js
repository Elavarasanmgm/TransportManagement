const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('transport_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (res.status === 401) {
    // Token expired or invalid — force re-login
    localStorage.removeItem('transport_token');
    localStorage.removeItem('transport_user');
    localStorage.removeItem('transport_company');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- Vehicles ----------
export const getVehicles   = ()       => request('/vehicles');
export const createVehicle = (data)   => request('/vehicles',    { method: 'POST',   body: JSON.stringify(data) });
export const updateVehicle = (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteVehicle = (id)     => request(`/vehicles/${id}`, { method: 'DELETE' });

// ---------- Rentals ----------
export const getRentals   = ()        => request('/rentals');
export const createRental = (data)    => request('/rentals',     { method: 'POST',   body: JSON.stringify(data) });
export const updateRental = (id, data)=> request(`/rentals/${id}`,  { method: 'PUT', body: JSON.stringify(data) });
export const deleteRental = (id)      => request(`/rentals/${id}`,  { method: 'DELETE' });

// ---------- Expenses ----------
export const getExpenses   = ()        => request('/expenses');
export const createExpense = (data)    => request('/expenses',    { method: 'POST',   body: JSON.stringify(data) });
export const updateExpense = (id, data)=> request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteExpense = (id)      => request(`/expenses/${id}`, { method: 'DELETE' });

// ---------- Drivers ----------
export const getDrivers   = ()        => request('/drivers');
export const createDriver = (data)    => request('/drivers',     { method: 'POST',   body: JSON.stringify(data) });
export const updateDriver = (id, data)=> request(`/drivers/${id}`,  { method: 'PUT', body: JSON.stringify(data) });
export const deleteDriver = (id)      => request(`/drivers/${id}`,  { method: 'DELETE' });

// ---------- Attendance ----------
export const getAttendance   = (date) => request(date ? `/attendance?date=${date}` : '/attendance');
export const createAttendance= (data) => request('/attendance',  { method: 'POST',   body: JSON.stringify(data) });
export const updateAttendance= (id, data) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAttendance= (id)   => request(`/attendance/${id}`, { method: 'DELETE' });

// ---------- Customers ----------
export const getCustomers   = ()       => request('/customers');
export const createCustomer = (data)   => request('/customers',  { method: 'POST',   body: JSON.stringify(data) });
export const updateCustomer = (id, data)=> request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCustomer = (id)     => request(`/customers/${id}`, { method: 'DELETE' });

// ---------- Dashboard ----------
export const getDashboard = () => request('/dashboard');

// ---------- Auth ----------
export const checkNeedsSetup      = ()      => request('/auth/needs-setup');
export const signup                = (data)  => request('/auth/signup',   { method: 'POST', body: JSON.stringify(data) });
export const login                 = (data)  => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) });
export const getCompanySettings    = ()      => request('/auth/settings');
export const updateCompanySettings = (data)  => request('/auth/settings', { method: 'PUT',  body: JSON.stringify(data) });

// ---------- Users (admin) ----------
export const getUsers    = ()           => request('/users');
export const createUser  = (data)       => request('/users',      { method: 'POST',   body: JSON.stringify(data) });
export const updateUser  = (id, data)   => request(`/users/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
export const deleteUser  = (id)         => request(`/users/${id}`, { method: 'DELETE' });

// ---------- Vehicle Types ----------
export const getVehicleTypes   = ()      => request('/vehicle-types');
export const createVehicleType = (data)  => request('/vehicle-types',      { method: 'POST',   body: JSON.stringify(data) });
export const deleteVehicleType = (id)    => request(`/vehicle-types/${id}`, { method: 'DELETE' });

