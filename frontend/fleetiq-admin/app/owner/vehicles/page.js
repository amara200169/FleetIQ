'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  IDLE: 'bg-blue-100 text-blue-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
};

const blank = { licensePlate: '', make: '', model: '', year: '', color: '', capacity: '', status: 'ACTIVE', currentMileage: '', insuranceExpiry: '', registrationExpiry: '', notes: '' };

function isExpiringSoon(date) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}
function isExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetch = async () => {
    const res = await api.get('/api/vehicles');
    setVehicles(res.data);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetch().catch(console.error);
  }, []);

  const resetForm = () => { setForm(blank); setEditId(null); setShowForm(false); setMsg(''); setErr(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    try {
      if (editId) {
        await api.patch(`/api/vehicles/${editId}`, form);
        setMsg('Vehicle updated successfully.');
      } else {
        await api.post('/api/vehicles', form);
        setMsg('Vehicle created successfully.');
      }
      resetForm();
      await fetch();
    } catch (e) {
      setErr(e.response?.data?.error || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (v) => {
    setEditId(v.id);
    setForm({
      licensePlate: v.licensePlate, make: v.make || '', model: v.model,
      year: v.year || '', color: v.color || '', capacity: v.capacity,
      status: v.status, currentMileage: v.currentMileage || '',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '',
      registrationExpiry: v.registrationExpiry ? v.registrationExpiry.slice(0, 10) : '',
      notes: v.notes || '',
    });
    setShowForm(true);
    setMsg(''); setErr('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle and all its deliveries?')) return;
    try {
      await api.delete(`/api/vehicles/${id}`);
      await fetch();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete.');
    }
  };

  const filtered = filter === 'ALL' ? vehicles : vehicles.filter((v) => v.status === filter);

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Fleet Vehicles</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Vehicle
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['ALL', 'ACTIVE', 'IDLE', 'MAINTENANCE', 'OUT_OF_SERVICE'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {s.replace('_', ' ')} {s === 'ALL' ? `(${vehicles.length})` : `(${vehicles.filter(v => v.status === s).length})`}
            </button>
          ))}
        </div>

        {msg && <p className="mb-4 text-sm text-green-600 font-medium">{msg}</p>}
        {err && <p className="mb-4 text-sm text-red-600 font-medium">{err}</p>}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">{editId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['licensePlate', 'License Plate *', 'text', !editId],
                ['make', 'Make', 'text', false],
                ['model', 'Model *', 'text', false],
                ['year', 'Year', 'number', false],
                ['color', 'Color', 'text', false],
                ['capacity', 'Capacity (tons) *', 'number', false],
                ['currentMileage', 'Current Mileage (km)', 'number', false],
                ['insuranceExpiry', 'Insurance Expiry', 'date', false],
                ['registrationExpiry', 'Registration Expiry', 'date', false],
              ].map(([key, label, type, req]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} required={req} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    readOnly={key === 'licensePlate' && !!editId}
                    className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${key === 'licensePlate' && editId ? 'bg-gray-100' : ''}`} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {['ACTIVE', 'IDLE', 'MAINTENANCE', 'OUT_OF_SERVICE'].map((s) => <option key={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {loading ? 'Saving...' : editId ? 'Update Vehicle' : 'Create Vehicle'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Vehicle list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            {vehicles.length === 0 ? 'No vehicles yet. Add your first vehicle above.' : 'No vehicles match the selected filter.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <div key={v.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{v.licensePlate}</p>
                    <p className="text-sm text-gray-500">{[v.year, v.make, v.model].filter(Boolean).join(' ')}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600'}`}>
                    {v.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <p>Driver: <span className="font-medium">{v.driver ? v.driver.email : <span className="text-red-500">Unassigned</span>}</span></p>
                  <p>Capacity: <span className="font-medium">{v.capacity} tons</span> &nbsp;·&nbsp; Mileage: <span className="font-medium">{v.currentMileage?.toLocaleString() || 0} km</span></p>
                  {v.color && <p>Color: <span className="font-medium">{v.color}</span></p>}
                </div>
                <div className="text-xs space-y-1 mb-3">
                  {v.insuranceExpiry && (
                    <p className={isExpired(v.insuranceExpiry) ? 'text-red-600 font-medium' : isExpiringSoon(v.insuranceExpiry) ? 'text-yellow-600 font-medium' : 'text-gray-500'}>
                      Insurance: {isExpired(v.insuranceExpiry) ? '⚠ EXPIRED' : isExpiringSoon(v.insuranceExpiry) ? '⚠ ' : ''}{new Date(v.insuranceExpiry).toLocaleDateString()}
                    </p>
                  )}
                  {v.registrationExpiry && (
                    <p className={isExpired(v.registrationExpiry) ? 'text-red-600 font-medium' : isExpiringSoon(v.registrationExpiry) ? 'text-yellow-600 font-medium' : 'text-gray-500'}>
                      Registration: {isExpired(v.registrationExpiry) ? '⚠ EXPIRED' : isExpiringSoon(v.registrationExpiry) ? '⚠ ' : ''}{new Date(v.registrationExpiry).toLocaleDateString()}
                    </p>
                  )}
                  {v.lastServiceDate && <p className="text-gray-500">Last Service: {new Date(v.lastServiceDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(v)} className="flex-1 text-center text-xs py-1.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50">Edit</button>
                  <button onClick={() => handleDelete(v.id)} className="flex-1 text-center text-xs py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
