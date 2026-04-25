import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useLanguage } from './LanguageContext';

const AppContext = createContext();

const initialVehicles = [
  { id: 1, name: 'Lorry - TN01AB1234', type: 'Lorry', regNo: 'TN01AB1234', model: 'Tata LPT 1613', year: 2019, status: 'available', driver: 'Raju Kumar', dailyRate: 4500, color: '#3b82f6', emoji: '🚛' },
  { id: 2, name: 'JCB - TN02CD5678', type: 'JCB', regNo: 'TN02CD5678', model: 'JCB 3DX', year: 2020, status: 'on-rent', driver: 'Selvam M', dailyRate: 6000, color: '#f59e0b', emoji: '🚜' },
  { id: 3, name: 'Tractor - TN03EF9012', type: 'Tractor', regNo: 'TN03EF9012', model: 'Mahindra 575 DI', year: 2021, status: 'available', driver: 'Murugan K', dailyRate: 2500, color: '#10b981', emoji: '🚜' },
  { id: 4, name: 'Car - TN04GH3456', type: 'Car', regNo: 'TN04GH3456', model: 'Toyota Innova', year: 2022, status: 'maintenance', driver: 'Arjun P', dailyRate: 2000, color: '#8b5cf6', emoji: '🚗' },
];

const initialRentals = [
  { id: 1, vehicleId: 1, vehicleName: 'Lorry - TN01AB1234', customer: 'Ram Constructions', phone: '9876543210', startDate: '2026-03-01', endDate: '2026-03-05', days: 5, dailyRate: 4500, totalAmount: 22500, advancePaid: 10000, balance: 12500, purpose: 'Sand transport', status: 'completed' },
  { id: 2, vehicleId: 2, vehicleName: 'JCB - TN02CD5678', customer: 'Suresh Builders', phone: '9876501234', startDate: '2026-03-08', endDate: '2026-03-12', days: 4, dailyRate: 6000, totalAmount: 24000, advancePaid: 12000, balance: 12000, purpose: 'Foundation work', status: 'active' },
  { id: 3, vehicleId: 3, vehicleName: 'Tractor - TN03EF9012', customer: 'Padma Farms', phone: '8765432109', startDate: '2026-02-20', endDate: '2026-02-24', days: 4, dailyRate: 2500, totalAmount: 10000, advancePaid: 5000, balance: 5000, purpose: 'Field ploughing', status: 'completed' },
];

const initialExpenses = [
  { id: 1, vehicleId: 1, vehicleName: 'Lorry - TN01AB1234', category: 'Fuel', amount: 3500, date: '2026-03-02', description: 'Diesel fill - 50L', paidBy: 'Cash' },
  { id: 2, vehicleId: 2, vehicleName: 'JCB - TN02CD5678', category: 'Maintenance', amount: 8000, date: '2026-03-01', description: 'Engine service', paidBy: 'Account' },
  { id: 3, vehicleId: 4, vehicleName: 'Car - TN04GH3456', category: 'Repair', amount: 5500, date: '2026-03-07', description: 'Brake pad replacement', paidBy: 'Cash' },
  { id: 4, vehicleId: 1, vehicleName: 'Lorry - TN01AB1234', category: 'Insurance', amount: 12000, date: '2026-02-15', description: 'Annual insurance renewal', paidBy: 'Account' },
  { id: 5, vehicleId: 3, vehicleName: 'Tractor - TN03EF9012', category: 'Fuel', amount: 2000, date: '2026-03-04', description: 'Diesel fill - 30L', paidBy: 'Cash' },
];

const initialDrivers = [
  { id: 1, name: 'Raju Kumar', phone: '9876543210', licenseNo: 'TN-0119960034761', licenseType: 'HMV', vehicleId: 1, vehicleName: 'Lorry - TN01AB1234', joinDate: '2020-01-15', salary: 18000, advance: 5000, status: 'active' },
  { id: 2, name: 'Selvam M', phone: '9876501234', licenseNo: 'TN-0120050012345', licenseType: 'HMV', vehicleId: 2, vehicleName: 'JCB - TN02CD5678', joinDate: '2021-03-10', salary: 20000, advance: 0, status: 'active' },
  { id: 3, name: 'Murugan K', phone: '8765432109', licenseNo: 'TN-0120100056789', licenseType: 'LMV', vehicleId: 3, vehicleName: 'Tractor - TN03EF9012', joinDate: '2019-06-20', salary: 15000, advance: 3000, status: 'active' },
  { id: 4, name: 'Arjun P', phone: '7654321098', licenseNo: 'TN-0120150067890', licenseType: 'LMV', vehicleId: 4, vehicleName: 'Car - TN04GH3456', joinDate: '2022-09-01', salary: 16000, advance: 0, status: 'active' },
];

const today = '2026-03-10';
const initialAttendance = [
  { id: 1, driverId: 1, driverName: 'Raju Kumar', date: today, status: 'present', inTime: '08:00', outTime: '18:00', overtime: 0, notes: '' },
  { id: 2, driverId: 2, driverName: 'Selvam M', date: today, status: 'present', inTime: '07:30', outTime: '19:00', overtime: 1, notes: '' },
  { id: 3, driverId: 3, driverName: 'Murugan K', date: today, status: 'absent', inTime: '', outTime: '', overtime: 0, notes: 'Sick leave' },
  { id: 4, driverId: 4, driverName: 'Arjun P', date: today, status: 'present', inTime: '09:00', outTime: '17:00', overtime: 0, notes: '' },
];

const initialCustomers = [
  { id: 1, name: 'Ram Constructions', contact: 'Ram Kumar', phone: '9876543210', email: 'ram@ramconstructions.com', address: 'Coimbatore, TN', totalRentals: 5, totalAmount: 95000, status: 'active' },
  { id: 2, name: 'Suresh Builders', contact: 'Suresh S', phone: '9876501234', email: 'suresh@builders.com', address: 'Salem, TN', totalRentals: 3, totalAmount: 68000, status: 'active' },
  { id: 3, name: 'Padma Farms', contact: 'Padma R', phone: '8765432109', email: '', address: 'Erode, TN', totalRentals: 2, totalAmount: 20000, status: 'active' },
];

export function AppProvider({ children }) {
  const { language } = useLanguage();
  const isTamil = language === 'ta';
  const [vehicles,     setVehicles]     = useState([]);
  const [rentals,      setRentals]      = useState([]);
  const [expenses,     setExpenses]     = useState([]);
  const [drivers,      setDrivers]      = useState([]);
  const [attendance,   setAttendance]   = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Normalise DB PascalCase column names → camelCase for the UI
  function normalise(rows) {
    return rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k.charAt(0).toLowerCase() + k.slice(1)] = v;
      }
      return out;
    });
  }

  // Load all data once on mount
  useEffect(() => {
    Promise.all([
      api.getVehicles(),
      api.getRentals(),
      api.getExpenses(),
      api.getDrivers(),
      api.getAttendance(),
      api.getCustomers(),
      api.getVehicleTypes(),
    ])
      .then(([v, r, e, d, a, c, vt]) => {
        setVehicles(normalise(v));
        setRentals(normalise(r));
        setExpenses(normalise(e));
        setDrivers(normalise(d));
        setAttendance(normalise(a));
        setCustomers(normalise(c));
        setVehicleTypes(normalise(vt));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ---------- Vehicles ----------
  const addVehicle    = useCallback(async (data) => {
    const saved = await api.createVehicle(data);
    setVehicles(prev => [...prev, normalise([saved])[0]]);
  }, []);
  const updateVehicle = useCallback(async (data) => {
    const saved = await api.updateVehicle(data.id, data);
    setVehicles(prev => prev.map(v => v.id === data.id ? normalise([saved])[0] : v));
  }, []);
  const deleteVehicle = useCallback(async (id) => {
    await api.deleteVehicle(id);
    setVehicles(prev => prev.filter(v => v.id !== id));
  }, []);

  // ---------- Rentals ----------
  const addRental    = useCallback(async (data) => {
    const saved = await api.createRental(data);
    setRentals(prev => [...prev, normalise([saved])[0]]);
    api.getCustomers().then(rows => setCustomers(normalise(rows))).catch(() => {});
  }, []);
  const updateRental = useCallback(async (data) => {
    const saved = await api.updateRental(data.id, data);
    setRentals(prev => prev.map(r => r.id === data.id ? normalise([saved])[0] : r));
    api.getCustomers().then(rows => setCustomers(normalise(rows))).catch(() => {});
  }, []);
  const deleteRental = useCallback(async (id) => {
    await api.deleteRental(id);
    setRentals(prev => prev.filter(r => r.id !== id));
    api.getCustomers().then(rows => setCustomers(normalise(rows))).catch(() => {});
  }, []);

  // ---------- Expenses ----------
  const addExpense    = useCallback(async (data) => {
    const saved = await api.createExpense(data);
    setExpenses(prev => [...prev, normalise([saved])[0]]);
  }, []);
  const updateExpense = useCallback(async (data) => {
    const saved = await api.updateExpense(data.id, data);
    setExpenses(prev => prev.map(e => e.id === data.id ? normalise([saved])[0] : e));
  }, []);
  const deleteExpense = useCallback(async (id) => {
    await api.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // ---------- Drivers ----------
  const addDriver    = useCallback(async (data) => {
    const saved = await api.createDriver(data);
    setDrivers(prev => [...prev, normalise([saved])[0]]);
  }, []);
  const updateDriver = useCallback(async (data) => {
    const saved = await api.updateDriver(data.id, data);
    setDrivers(prev => prev.map(d => d.id === data.id ? normalise([saved])[0] : d));
  }, []);
  const deleteDriver = useCallback(async (id) => {
    await api.deleteDriver(id);
    setDrivers(prev => prev.filter(d => d.id !== id));
  }, []);

  // ---------- Attendance ----------
  const addAttendance    = useCallback(async (data) => {
    const saved = await api.createAttendance(data);
    const norm  = normalise([saved])[0];
    // backend may return an updated existing record (upsert) — handle both cases
    setAttendance(prev => {
      const exists = prev.find(a => a.id === norm.id);
      return exists ? prev.map(a => a.id === norm.id ? norm : a) : [...prev, norm];
    });
  }, []);
  const updateAttendance = useCallback(async (data) => {
    const saved = await api.updateAttendance(data.id, data);
    setAttendance(prev => prev.map(a => a.id === data.id ? normalise([saved])[0] : a));
  }, []);
  const deleteAttendance = useCallback(async (id) => {
    await api.deleteAttendance(id);
    setAttendance(prev => prev.filter(a => a.id !== id));
  }, []);

  // ---------- Customers ----------
  const addCustomer    = useCallback(async (data) => {
    const saved = await api.createCustomer(data);
    const norm = normalise([saved])[0];
    setCustomers(prev => [...prev, norm]);
    return norm;
  }, []);
  const updateCustomer = useCallback(async (data) => {
    const saved = await api.updateCustomer(data.id, data);
    setCustomers(prev => prev.map(c => c.id === data.id ? normalise([saved])[0] : c));
  }, []);
  const deleteCustomer = useCallback(async (id) => {
    await api.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  // ---------- Vehicle Types ----------
  const addVehicleType = useCallback(async (data) => {
    const saved = await api.createVehicleType(data);
    setVehicleTypes(prev => [...prev, normalise([saved])[0]]);
  }, []);
  const removeVehicleType = useCallback(async (id) => {
    await api.deleteVehicleType(id);
    setVehicleTypes(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      loading, error,
      vehicles,     addVehicle,    updateVehicle,    deleteVehicle,
      rentals,      addRental,     updateRental,     deleteRental,
      expenses,     addExpense,    updateExpense,    deleteExpense,
      drivers,      addDriver,     updateDriver,     deleteDriver,
      attendance,   addAttendance, updateAttendance, deleteAttendance,
      customers,    addCustomer,   updateCustomer,   deleteCustomer,
      vehicleTypes, addVehicleType, removeVehicleType,
    }}>
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:'1.2rem', color:'#64748b' }}>
          {isTamil ? 'தரவுத்தளத்துடன் இணைக்கப்படுகிறது…' : 'Connecting to database…'}
        </div>
      ) : error ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', color:'#ef4444' }}>
          <h2>{isTamil ? 'API சேவையகத்துடன் இணைக்க முடியவில்லை' : 'Could not connect to the API server'}</h2>
          <p style={{ color:'#64748b' }}>{error}</p>
          <p style={{ color:'#64748b', fontSize:'0.9rem' }}>
            {isTamil ? 'பின்புற சேவை இயங்குகிறதா என்பதை உறுதிப்படுத்தவும்:' : 'Make sure the backend is running:'} <code>cd C:\Transport\server &amp;&amp; npm run dev</code>
          </p>
        </div>
      ) : children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

