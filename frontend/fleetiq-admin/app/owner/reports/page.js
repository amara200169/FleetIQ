'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const STATUS_COLORS = {
  PENDING: '#94a3b8', ASSIGNED: '#60a5fa', IN_TRANSIT: '#f59e0b',
  DELIVERED: '#22c55e', FAILED: '#ef4444', CANCELLED: '#6b7280',
};

export default function ReportsPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [fuel, setFuel] = useState({ logs: [], totalCost: 0, totalLiters: 0 });
  const [maintenance, setMaintenance] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const [dRes, vRes, fRes, mRes] = await Promise.all([
        api.get(`/api/deliveries/fleet?${params}`),
        api.get('/api/vehicles'),
        api.get('/api/fuel'),
        api.get('/api/maintenance'),
      ]);
      setDeliveries(dRes.data);
      setVehicles(vRes.data);
      setFuel(fRes.data);
      setMaintenance(mRes.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetchAll();
  }, []);

  const statusCounts = deliveries.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const deliveryRate = deliveries.length > 0 ? ((statusCounts.DELIVERED || 0) / deliveries.length * 100).toFixed(1) : 0;
  const maintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);

  const exportCSV = (rows, cols, filename) => {
    const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${r[c] ?? ''}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const exportDeliveries = () => {
    exportCSV(
      deliveries.map((d) => ({
        id: d.id, description: d.description, destination: d.destination,
        customer: d.customerName || '', status: d.status, priority: d.priority,
        vehicle: d.vehicle.licensePlate, driver: d.vehicle.driver?.email || '',
        date: new Date(d.createdAt).toLocaleDateString(),
        deliveredAt: d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '',
      })),
      ['id', 'description', 'destination', 'customer', 'status', 'priority', 'vehicle', 'driver', 'date', 'deliveredAt'],
      'deliveries-report.csv'
    );
  };

  const exportFuel = () => {
    exportCSV(
      fuel.logs.map((l) => ({
        vehicle: l.vehicle.licensePlate, driver: l.driver.email,
        liters: l.fuelAmount, cost: l.fuelCost, odometer: l.odometer,
        station: l.fuelStation || '', date: new Date(l.createdAt).toLocaleDateString(),
      })),
      ['vehicle', 'driver', 'liters', 'cost', 'odometer', 'station', 'date'],
      'fuel-report.csv'
    );
  };


  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Fleet Reports</h1>

        {/* Date filter */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={fetchAll} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Apply</button>
          {(from || to) && <button onClick={() => { setFrom(''); setTo(''); setTimeout(fetchAll, 0); }} className="text-sm text-gray-500 hover:underline">Clear</button>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Total Deliveries', deliveries.length, 'text-gray-800'],
            ['Delivery Rate', `${deliveryRate}%`, 'text-green-600'],
            ['Fuel Spend', `$${fuel.totalCost.toFixed(2)}`, 'text-blue-600'],
            ['Maintenance Cost', `$${maintenanceCost.toFixed(2)}`, 'text-orange-600'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-white rounded-xl shadow p-5 text-center">
              <p className={`text-3xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Delivery status breakdown */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Delivery Status Breakdown</h2>
            <button onClick={exportDeliveries} className="text-sm text-blue-600 hover:underline border border-blue-300 px-3 py-1 rounded">Export CSV</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="rounded-lg p-3 text-center" style={{ backgroundColor: `${STATUS_COLORS[status]}20`, border: `1px solid ${STATUS_COLORS[status]}40` }}>
                <p className="text-2xl font-bold" style={{ color: STATUS_COLORS[status] }}>{count}</p>
                <p className="text-xs text-gray-600 mt-0.5">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle utilization */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Vehicle Utilization</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  {['Vehicle', 'Status', 'Driver', 'Deliveries', 'Fuel Cost', 'Mileage'].map((h) => (
                    <th key={h} className="px-4 py-2 border-b text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const vDeliveries = deliveries.filter((d) => d.vehicle.id === v.id);
                  const vFuel = fuel.logs.filter((l) => l.vehicle.id === v.id);
                  const vFuelCost = vFuel.reduce((s, l) => s + l.fuelCost, 0);
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b font-medium">{v.licensePlate}<br /><span className="text-xs text-gray-400">{v.model}</span></td>
                      <td className="px-4 py-3 border-b">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
                      </td>
                      <td className="px-4 py-3 border-b text-gray-500 text-xs">{v.driver?.email || '—'}</td>
                      <td className="px-4 py-3 border-b">{vDeliveries.length}</td>
                      <td className="px-4 py-3 border-b">{vFuelCost > 0 ? `$${vFuelCost.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 border-b text-gray-500">{v.currentMileage?.toLocaleString() || 0} km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fuel report */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Fuel Summary</h2>
            <button onClick={exportFuel} className="text-sm text-blue-600 hover:underline border border-blue-300 px-3 py-1 rounded">Export CSV</button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">${fuel.totalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Cost</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{fuel.totalLiters.toFixed(1)} L</p>
              <p className="text-xs text-gray-500">Total Fuel</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{fuel.logs.length}</p>
              <p className="text-xs text-gray-500">Fill-ups</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
