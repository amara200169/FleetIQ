'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../lib/api';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

export default function FleetAnalytics() {
  const [stats, setStats] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/fleet'),
      api.get('/api/deliveries/fleet'),
      api.get('/api/vehicles'),
    ]).then(([sRes, dRes, vRes]) => {
      setStats(sRes.data);
      setVehicles(vRes.data);
      setDeliveries(dRes.data);
    }).catch(console.error);
  }, []);

  const filtered = dateFilter
    ? deliveries.filter((d) => new Date(d.createdAt).toISOString().slice(0, 10) === dateFilter)
    : deliveries;

  const statusGroups = filtered.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusGroups).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  const barData = vehicles.map((v) => ({ model: v.model, capacity: v.capacity }));

  const exportCSV = () => {
    const header = 'ID,Destination,Status,Vehicle,Created At';
    const rows = filtered.map((d) => `${d.id},${d.destination},${d.status},${d.vehicle?.model || ''},${new Date(d.createdAt).toLocaleString()}`);
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent([header, ...rows].join('\n'));
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'fleet_analytics.csv';
    a.click();
  };

  if (!stats) return <div className="p-6 text-gray-500">Loading analytics...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-5xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Fleet Analytics</h2>

      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <label className="text-sm font-medium text-gray-600">Filter by date:</label>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border px-3 py-1 rounded text-sm" />
        <button onClick={exportCSV} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">Export CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[['Deliveries', filtered.length, 'indigo'], ['Vehicles', stats.total_vehicles, 'green'], ['Drivers', stats.total_drivers, 'yellow']].map(([label, val, color]) => (
          <div key={label} className={`p-4 bg-${color}-50 rounded-xl shadow text-center`}>
            <p className={`text-3xl font-bold text-${color}-700`}>{val}</p>
            <p className={`text-sm font-medium text-${color}-600 mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-700">Vehicle Capacities</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <XAxis dataKey="model" /><YAxis /><Tooltip />
              <Bar dataKey="capacity" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-700">Delivery Status</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
