'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'ADMIN') { router.push('/'); return; }
    api.get('/api/admin/vehicles').then((r) => setVehicles(r.data)).catch(console.error);
  }, []);

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">All Vehicles</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow">
            <thead className="bg-gray-100 text-gray-700 text-left text-sm">
              <tr>
                <th className="px-4 py-3 border-b">License Plate</th>
                <th className="px-4 py-3 border-b">Model</th>
                <th className="px-4 py-3 border-b">Capacity</th>
                <th className="px-4 py-3 border-b">Active</th>
                <th className="px-4 py-3 border-b">Owner</th>
                <th className="px-4 py-3 border-b">Driver</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-4 py-2 border-b font-mono">{v.licensePlate}</td>
                  <td className="px-4 py-2 border-b">{v.model}</td>
                  <td className="px-4 py-2 border-b">{v.capacity} kg</td>
                  <td className="px-4 py-2 border-b">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b">{v.owner?.email ?? 'N/A'}</td>
                  <td className="px-4 py-2 border-b">{v.driver?.email ?? 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
