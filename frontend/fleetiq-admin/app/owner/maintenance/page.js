'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const TYPES = ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'INSPECTION', 'REPAIR', 'OTHER'];
const TYPE_COLORS = {
  OIL_CHANGE: 'bg-yellow-100 text-yellow-700',
  TIRE_ROTATION: 'bg-blue-100 text-blue-700',
  BRAKE_SERVICE: 'bg-red-100 text-red-700',
  INSPECTION: 'bg-purple-100 text-purple-700',
  REPAIR: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const blank = { vehicleId: '', type: 'OIL_CHANGE', description: '', cost: '', odometer: '', nextDueDate: '', nextDueMileage: '', notes: '' };

export default function MaintenancePage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState({ vehicleAlerts: [], maintenanceAlerts: [] });
  const [form, setForm] = useState(blank);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchAll = async () => {
    const [logsRes, vehiclesRes, alertsRes] = await Promise.all([
      api.get('/api/maintenance'),
      api.get('/api/vehicles'),
      api.get('/api/maintenance/alerts'),
    ]);
    setLogs(logsRes.data);
    setVehicles(vehiclesRes.data);
    setAlerts(alertsRes.data);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetchAll().catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    try {
      await api.post('/api/maintenance', form);
      setMsg('Maintenance log added.');
      setForm(blank);
      setShowForm(false);
      await fetchAll();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to add log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this maintenance log?')) return;
    await api.delete(`/api/maintenance/${id}`);
    await fetchAll();
  };

  const filtered = filterVehicle ? logs.filter((l) => l.vehicle.id === parseInt(filterVehicle)) : logs;
  const totalCost = filtered.reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Maintenance Logs</h1>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Log Maintenance
          </button>
        </div>

        {/* Alerts */}
        {(alerts.vehicleAlerts.length > 0 || alerts.maintenanceAlerts.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Upcoming Alerts (next 30 days)</h3>
            {alerts.vehicleAlerts.map((v) => (
              <p key={v.id} className="text-xs text-yellow-700">
                {v.licensePlate} — {v.insuranceExpiry && new Date(v.insuranceExpiry) <= new Date(Date.now() + 30*86400000) ? 'Insurance expires ' + new Date(v.insuranceExpiry).toLocaleDateString() : ''}
                {v.registrationExpiry && new Date(v.registrationExpiry) <= new Date(Date.now() + 30*86400000) ? ' · Registration expires ' + new Date(v.registrationExpiry).toLocaleDateString() : ''}
              </p>
            ))}
            {alerts.maintenanceAlerts.map((m) => (
              <p key={m.id} className="text-xs text-yellow-700">{m.vehicle.licensePlate} — {m.type.replace('_', ' ')} due {new Date(m.nextDueDate).toLocaleDateString()}</p>
            ))}
          </div>
        )}

        {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}
        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Log Maintenance</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle *</label>
                <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {TYPES.map((t) => <option key={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              {[['cost', 'Cost ($)', 'number'], ['odometer', 'Odometer (km)', 'number'], ['nextDueDate', 'Next Due Date', 'date'], ['nextDueMileage', 'Next Due Mileage', 'number']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Log'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Stats + Filter */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="bg-white rounded-lg shadow px-4 py-3 text-center min-w-[120px]">
            <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
            <p className="text-xs text-gray-500">Total Logs</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-3 text-center min-w-[120px]">
            <p className="text-2xl font-bold text-green-600">${logs.reduce((s, l) => s + (l.cost || 0), 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total Cost</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">All Vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>)}
            </select>
          </div>
        </div>

        {/* Logs table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No maintenance logs yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  {['Vehicle', 'Type', 'Description', 'Cost', 'Odometer', 'Next Due', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 border-b text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b font-medium">{l.vehicle.licensePlate}<br /><span className="text-xs text-gray-400">{l.vehicle.model}</span></td>
                    <td className="px-4 py-3 border-b"><span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[l.type] || 'bg-gray-100 text-gray-600'}`}>{l.type.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 border-b max-w-[200px] truncate">{l.description}</td>
                    <td className="px-4 py-3 border-b">{l.cost ? `$${l.cost.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 border-b text-gray-500">{l.odometer ? `${l.odometer.toLocaleString()} km` : '—'}</td>
                    <td className="px-4 py-3 border-b text-gray-500">{l.nextDueDate ? new Date(l.nextDueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 border-b text-gray-400 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 border-b">
                      <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
