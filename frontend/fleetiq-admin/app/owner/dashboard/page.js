'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CreateDeliveryForm from '../../../components/CreateDeliveryForm';
import MapTrackingWithETA from '../../../components/MapTrackingWithETA';
import FleetAnalytics from '../../../components/FleetAnalytics';
import api from '../../../lib/api';

const STATUS_META = {
  PENDING:    { label: 'Pending',    bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200' },
  ASSIGNED:   { label: 'Assigned',   bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200' },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200' },
  DELIVERED:  { label: 'Delivered',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  FAILED:     { label: 'Failed',     bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-200' },
  CANCELLED:  { label: 'Cancelled',  bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400',    border: 'border-gray-200' },
};

export default function FleetOwnerDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [etaData, setEtaData] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('model');
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/api/vehicles'),
        api.get('/api/deliveries/fleet'),
      ]);
      setVehicles(vRes.data);
      setDeliveries(dRes.data);

      const etas = {};
      await Promise.all(
        dRes.data.map(async (d) => {
          try {
            const etaRes = await api.get('/api/analytics/proxy/distance-matrix', {
              params: { origin: '45.0000,-93.2650', destination: d.destination },
            });
            const el = etaRes.data.rows?.[0]?.elements?.[0];
            etas[d.id] = el?.status === 'OK' ? el.duration.text : 'Unavailable';
          } catch {
            etas[d.id] = 'Error';
          }
        })
      );
      setEtaData(etas);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetchData();
  }, [fetchData]);

  const handleDeleteDelivery = async (id) => {
    try {
      await api.delete(`/api/deliveries/${id}`);
      setMessage('Delivery deleted.');
      fetchData();
    } catch {
      setMessage('Could not delete delivery.');
    }
  };

  const getProofImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  };

  const filteredVehicles = vehicles
    .filter((v) => filter === 'all' ? true : filter === 'active' ? v.active : !v.active)
    .sort((a, b) => sortBy === 'model' ? a.model.localeCompare(b.model) : b.capacity - a.capacity);

  const groupedByDriver = filteredVehicles.reduce((acc, v) => {
    const key = v.driver?.email ?? 'Unassigned';
    (acc[key] = acc[key] || []).push(v);
    return acc;
  }, {});

  const activeVehicles = vehicles.filter((v) => v.active).length;
  const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT').length;
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED').length;

  // Trial countdown banner
  const TrialBanner = () => {
    const [billing, setBilling] = useState(null);
    useEffect(() => {
      api.get('/api/billing/status').then(r => setBilling(r.data)).catch(() => {});
    }, []);
    if (!billing || billing.subscriptionStatus !== 'trialing') return null;
    const daysLeft = billing.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
    if (daysLeft === null || daysLeft > 7) return null;
    const urgent = daysLeft <= 2;
    return (
      <div className={`px-8 py-3 flex items-center justify-between text-sm ${urgent ? 'bg-red-600' : 'bg-amber-500'}`}>
        <span className="text-white font-medium">
          {daysLeft === 0 ? '⚠️ Your free trial has expired.' : `⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial.`}
          {' '}Subscribe now to keep access to all features.
        </span>
        <a href="/billing" className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-4">
          Subscribe →
        </a>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading fleet data…</p>
      </div>
    </div>
  );

  return (
    <div>
      <TrialBanner />
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400 text-sm mb-1">Fleet Management</p>
          <h1 className="text-3xl font-black text-white tracking-tight">FleetIQ Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and manage your fleet in real time</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Vehicles',  val: vehicles.length },
              { label: 'Active Vehicles', val: activeVehicles },
              { label: 'In Transit',      val: inTransit },
              { label: 'Delivered',       val: completedDeliveries },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'analytics', label: 'Analytics' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            message.includes('deleted') || message.includes('created')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {activeTab === 'analytics' ? <FleetAnalytics /> : (
          <div className="space-y-6">
            {/* Fleet Vehicles */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Fleet Vehicles</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{vehicles.length} total · {activeVehicles} active</p>
                </div>
                <div className="flex gap-2">
                  <select onChange={(e) => setFilter(e.target.value)} value={filter}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Vehicles</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                  <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="model">Sort by Model</option>
                    <option value="capacity">Sort by Capacity</option>
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {Object.keys(groupedByDriver).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No vehicles found.</p>
                ) : Object.entries(groupedByDriver).map(([driver, vs]) => (
                  <div key={driver}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {driver === 'Unassigned' ? '?' : driver[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{driver}</span>
                      <span className="text-xs text-slate-400">· {vs.length} vehicle{vs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {vs.map((v) => (
                        <div key={v.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{v.model}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{v.licensePlate}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {v.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Capacity: <span className="font-semibold text-slate-700">{v.capacity} kg</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Delivery */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Create New Delivery</h2>
                <p className="text-xs text-slate-400 mt-0.5">Assign a delivery to an available vehicle</p>
              </div>
              <div className="p-6">
                <CreateDeliveryForm vehicles={vehicles} onSuccess={() => { fetchData(); setMessage('Delivery created.'); }} />
              </div>
            </div>

            {/* Deliveries */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Deliveries</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{deliveries.length} total</p>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{inTransit} in transit</span>
              </div>
              <div className="p-6">
                {deliveries.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No deliveries yet.</p>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map((d) => {
                      const s = STATUS_META[d.status] || STATUS_META.PENDING;
                      return (
                        <div key={d.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{d.description}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">→ {d.destination}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </div>
                              <button onClick={() => handleDeleteDelivery(d.id)}
                                className="text-xs px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-medium">
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-slate-500">ETA: <span className="font-medium text-slate-700">{etaData[d.id] || '—'}</span></span>
                            {d.deliveryNote && <span className="text-xs text-slate-500 truncate">Note: {d.deliveryNote}</span>}
                          </div>
                          {d.status === 'DELIVERED' && d.proofImage && (
                            <img src={getProofImageUrl(d.proofImage)} alt="Proof of delivery"
                              className="mt-3 w-36 h-24 object-cover rounded-lg shadow-sm border border-slate-100"
                              onError={(e) => { e.target.src = 'https://placehold.co/250x150?text=Not+Found'; }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Live Map */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Live Map Tracking</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time delivery positions</p>
              </div>
              <div className="p-6">
                <MapTrackingWithETA deliveries={deliveries} etaData={etaData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
