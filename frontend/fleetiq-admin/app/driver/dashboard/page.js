'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import DriverDeliveryMap from '../../../components/DriverDeliveryMap';

const STATUS_FLOW = ['PENDING', 'IN_TRANSIT', 'DELIVERED'];

const STATUS_META = {
  PENDING:    { label: 'Pending',    bg: 'bg-slate-50',   text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-200' },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200' },
  DELIVERED:  { label: 'Delivered',  bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
};

export default function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [message, setMessage] = useState('');
  const [proofData, setProofData] = useState({});
  const [loading, setLoading] = useState(true);
  const [routeDelivery, setRouteDelivery] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const router = useRouter();
  const locationInterval = useRef(null);

  const fetchData = async () => {
    const [dRes, vRes] = await Promise.all([
      api.get('/api/deliveries/assigned'),
      api.get('/api/vehicles/assigned'),
    ]);
    setDeliveries(dRes.data);
    setVehicle(vRes.data[0] || null);
    setLoading(false);
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setDriverLocation({ lat: coords.latitude, lng: coords.longitude });
          api.post('/api/drivers/location', { latitude: coords.latitude, longitude: coords.longitude }).catch(() => {});
        },
        () => {}
      );
    };
    push();
    locationInterval.current = setInterval(push, 15000);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'DRIVER') { router.push('/'); return; }
    fetchData().catch(() => router.push('/'));
    startLocationTracking();
    return () => clearInterval(locationInterval.current);
  }, []);

  const handleStatusChange = async (id, status) => {
    const delivery = deliveries.find((d) => d.id === id);
    if (delivery?.status === 'DELIVERED') return setMessage('Already delivered.');
    if (status === 'DELIVERED') return setMessage('Upload proof to mark as delivered.');
    try {
      await api.patch(`/api/deliveries/${id}/status`, { status });
      setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
      setMessage('Status updated.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error updating status.');
    }
  };

  const handleProofChange = (id, field, value) =>
    setProofData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const submitProof = async (id) => {
    const proof = proofData[id];
    if (!proof?.proof_image) return setMessage('Please select a proof image.');
    const form = new FormData();
    form.append('proof_image', proof.proof_image);
    form.append('delivery_note', proof.delivery_note || '');
    try {
      await api.patch(`/api/deliveries/${id}/proof`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status: 'DELIVERED' } : d));
      setMessage('Proof uploaded and delivery marked as delivered.');
    } catch {
      setMessage('Failed to upload proof.');
    }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const pending   = deliveries.filter((d) => d.status === 'PENDING').length;
  const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT').length;
  const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;

  const isSuccess = message.includes('updated') || message.includes('uploaded') || message.includes('delivered');

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading your deliveries…</p>
      </div>
    </div>
  );

  return (
    <>
    {routeDelivery && (
      <DriverDeliveryMap
        delivery={routeDelivery}
        driverLocation={driverLocation}
        onClose={() => setRouteDelivery(null)}
      />
    )}
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">
                {greeting} · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl font-black text-white tracking-tight">Driver Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Your assignments and delivery status</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex-shrink-0">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold">GPS Active</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: 'Pending',    val: pending,   color: 'text-slate-300' },
              { label: 'In Transit', val: inTransit, color: 'text-amber-400' },
              { label: 'Delivered',  val: delivered, color: 'text-emerald-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className={`text-2xl font-black ${color}`}>{val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Toast */}
        {message && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            isSuccess
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Assigned vehicle */}
        {vehicle ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Assigned Vehicle</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{vehicle.model}</p>
                <p className="text-sm text-slate-500">{vehicle.licensePlate} · {vehicle.capacity} kg capacity</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex-shrink-0">Assigned</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-sm text-slate-400">No vehicle assigned yet. Contact your fleet manager.</p>
          </div>
        )}

        {/* Deliveries */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Assigned Deliveries</h2>
              <p className="text-xs text-slate-400 mt-0.5">{deliveries.length} total</p>
            </div>
            {inTransit > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-semibold text-amber-700">{inTransit} in transit</span>
              </div>
            )}
          </div>

          <div className="p-6">
            {deliveries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 font-medium">No deliveries assigned</p>
                <p className="text-xs text-slate-400 mt-1">Check back soon for new assignments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => {
                  const s = STATUS_META[d.status] || STATUS_META.PENDING;
                  const stepIdx = STATUS_FLOW.indexOf(d.status);
                  return (
                    <div key={d.id} className={`border rounded-xl overflow-hidden ${s.border}`}>
                      {/* Card top */}
                      <div className={`px-5 py-4 ${s.bg}`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800">{d.description}</p>
                            <button
                              onClick={() => setRouteDelivery(d)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-0.5 flex items-center gap-1 group">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              <span className="truncate max-w-[180px]">{d.destination}</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </button>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border} flex-shrink-0`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </div>
                        </div>

                        {/* Progress track */}
                        <div className="flex items-center gap-0 mt-1">
                          {STATUS_FLOW.map((step, i) => (
                            <div key={step} className="flex-1 flex items-center">
                              <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= stepIdx ? 'bg-blue-500' : 'bg-slate-200'}`} />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-1.5">
                          {STATUS_FLOW.map((step, i) => (
                            <span key={step} className={`text-xs font-medium ${i <= stepIdx ? 'text-blue-600' : 'text-slate-400'}`}>
                              {step === 'IN_TRANSIT' ? 'In Transit' : step.charAt(0) + step.slice(1).toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card body — actions */}
                      {d.status !== 'DELIVERED' ? (
                        <div className="px-5 py-4 bg-white space-y-4">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex-shrink-0">Update Status</label>
                            <select
                              value={d.status}
                              onChange={(e) => handleStatusChange(d.id, e.target.value)}
                              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_TRANSIT">In Transit</option>
                              <option value="DELIVERED">Delivered (use proof below)</option>
                            </select>
                          </div>

                          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Proof of Delivery</p>
                            <input type="file" accept="image/*"
                              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                              onChange={(e) => handleProofChange(d.id, 'proof_image', e.target.files[0])} />
                            <textarea placeholder="Add a delivery note (optional)…" rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              onChange={(e) => handleProofChange(d.id, 'delivery_note', e.target.value)} />
                            <button onClick={() => submitProof(d.id)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                              Upload & Mark as Delivered
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-3 bg-white flex items-center justify-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-xs text-emerald-600 font-semibold">Delivery completed</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
