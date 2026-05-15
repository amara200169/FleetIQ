'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function AdminAssignDriverPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'ADMIN') { router.push('/'); return; }
    Promise.all([
      api.get('/api/admin/vehicles'),
      api.get('/api/admin/users'),
    ]).then(([vRes, uRes]) => {
      setVehicles(vRes.data);
      setDrivers(uRes.data.filter((u) => u.role === 'DRIVER'));
    }).catch(console.error);
  }, []);

  const handleAssign = async (vehicleId) => {
    const driverId = selected[vehicleId];
    if (!driverId) return setMessage('Please select a driver first.');
    try {
      await api.patch(`/api/vehicles/${vehicleId}/assign-driver`, { driver: parseInt(driverId) });
      setMessage('Driver assigned successfully.');
      const vRes = await api.get('/api/admin/vehicles');
      setVehicles(vRes.data);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Assignment failed.');
    }
  };

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Assign Drivers to Vehicles</h1>
        {message && <p className="mb-4 text-sm text-blue-600">{message}</p>}
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{v.model} — {v.licensePlate}</p>
                <p className="text-sm text-gray-500">Driver: {v.driver?.email ?? 'Unassigned'}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selected[v.id] || ''}
                  onChange={(e) => setSelected((p) => ({ ...p, [v.id]: e.target.value }))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select driver</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.email}</option>)}
                </select>
                <button onClick={() => handleAssign(v.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Assign</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
