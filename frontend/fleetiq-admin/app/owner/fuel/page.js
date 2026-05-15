'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const blank = { vehicleId: '', fuelAmount: '', fuelCost: '', odometer: '', fuelStation: '', notes: '' };

export default function FuelPage() {
  const router = useRouter();
  const [data, setData] = useState({ logs: [], totalCost: 0, totalLiters: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(blank);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchAll = async () => {
    const [fuelRes, vehiclesRes] = await Promise.all([api.get('/api/fuel'), api.get('/api/vehicles')]);
    setData(fuelRes.data);
    setVehicles(vehiclesRes.data);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetchAll().catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    try {
      await api.post('/api/fuel', form);
      setMsg('Fuel log added.');
      setForm(blank);
      setShowForm(false);
      await fetchAll();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to add fuel log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this fuel log?')) return;
    await api.delete(`/api/fuel/${id}`);
    await fetchAll();
  };

  const filtered = filterVehicle ? data.logs.filter((l) => l.vehicle.id === parseInt(filterVehicle)) : data.logs;
  const filteredCost = filtered.reduce((s, l) => s + l.fuelCost, 0);
  const filteredLiters = filtered.reduce((s, l) => s + l.fuelAmount, 0);
  const avgCostPerLiter = filteredLiters > 0 ? filteredCost / filteredLiters : 0;

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Fuel Logs</h1>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Log Fuel
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            ['Total Cost', `$${filteredCost.toFixed(2)}`, 'text-blue-600'],
            ['Total Fuel', `${filteredLiters.toFixed(1)} L`, 'text-green-600'],
            ['Avg Cost/L', `$${avgCostPerLiter.toFixed(2)}`, 'text-purple-600'],
            ['Fill-ups', filtered.length.toString(), 'text-gray-800'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}
        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Log Fuel Fill-up</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle *</label>
                <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>)}
                </select>
              </div>
              {[['fuelAmount', 'Fuel Amount (L) *', 'number'], ['fuelCost', 'Total Cost ($) *', 'number'], ['odometer', 'Odometer (km) *', 'number'], ['fuelStation', 'Fuel Station', 'text']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} required={label.includes('*')} step={type === 'number' ? '0.01' : undefined}
                    value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
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
                  {loading ? 'Saving...' : 'Save Fuel Log'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">All Vehicles</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} — {v.model}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No fuel logs yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  {['Vehicle', 'Driver', 'Liters', 'Cost', 'Cost/L', 'Odometer', 'Station', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 border-b text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b font-medium">{l.vehicle.licensePlate}<br /><span className="text-xs text-gray-400">{l.vehicle.model}</span></td>
                    <td className="px-4 py-3 border-b text-gray-500 text-xs">{l.driver.email}</td>
                    <td className="px-4 py-3 border-b">{l.fuelAmount.toFixed(1)} L</td>
                    <td className="px-4 py-3 border-b font-medium text-blue-600">${l.fuelCost.toFixed(2)}</td>
                    <td className="px-4 py-3 border-b text-gray-500">${(l.fuelCost / l.fuelAmount).toFixed(2)}/L</td>
                    <td className="px-4 py-3 border-b text-gray-500">{l.odometer.toLocaleString()} km</td>
                    <td className="px-4 py-3 border-b text-gray-500">{l.fuelStation || '—'}</td>
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
