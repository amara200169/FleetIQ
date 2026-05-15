'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const STATUS_OPTIONS = ['PENDING', 'IN_TRANSIT', 'DELIVERED'];

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'ADMIN') { router.push('/'); return; }
    api.get('/api/admin/deliveries').then((r) => setDeliveries(r.data)).catch(console.error);
  }, []);

  const handleStatusChange = async (id, status) => {
    await api.patch(`/api/admin/deliveries/${id}`, { status });
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Delivery Management</h1>
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow p-5">
              <p className="font-semibold text-gray-800">{d.description}</p>
              <p className="text-sm text-gray-500 mt-1">To: {d.destination}</p>
              <p className="text-sm text-gray-500">Vehicle: {d.vehicle?.model} — Driver: {d.vehicle?.driver?.email ?? 'Unassigned'}</p>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Status:</label>
                <select
                  value={d.status}
                  onChange={(e) => handleStatusChange(d.id, e.target.value)}
                  className="border px-3 py-1 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
