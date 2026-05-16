'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  ASSIGNED:   { label: 'Preparing',   color: 'bg-slate-100 text-slate-600',   step: 1 },
  IN_TRANSIT: { label: 'On the way',  color: 'bg-blue-100 text-blue-700',     step: 2 },
  DELIVERED:  { label: 'Delivered',   color: 'bg-emerald-100 text-emerald-700', step: 3 },
  FAILED:     { label: 'Failed',      color: 'bg-red-100 text-red-700',        step: 0 },
  CANCELLED:  { label: 'Cancelled',   color: 'bg-red-100 text-red-700',        step: 0 },
};

export default function TrackingPage() {
  const { slug } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const fetchDelivery = async () => {
    try {
      const res = await fetch(`${API}/api/track/${slug}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setDelivery(data);
      return data;
    } catch {
      setError('This tracking link is invalid or has expired.');
    }
  };

  // Initialize map
  useEffect(() => {
    if (!slug) return;
    fetchDelivery().then((data) => {
      if (!data) return;
      initMap(data);
    });
  }, [slug]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!delivery) return;
    const interval = setInterval(async () => {
      const data = await fetchDelivery();
      if (data && mapInstanceRef.current) updateMarkers(data);
    }, 15000);
    return () => clearInterval(interval);
  }, [delivery?.id]);

  const initMap = async (data) => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const driverLat = data.driver?.latitude;
    const driverLng = data.driver?.longitude;
    const destLat = data.latitude;
    const destLng = data.longitude;

    const centerLat = driverLat || destLat || 0;
    const centerLng = driverLng || destLng || 0;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([centerLat, centerLng], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Driver marker (blue truck icon)
    if (driverLat && driverLng) {
      const driverIcon = L.divIcon({
        className: '',
        html: `<div style="background:#2563eb;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚚</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('Driver location');
    }

    // Destination marker (red pin)
    if (destLat && destLng) {
      const destIcon = L.divIcon({
        className: '',
        html: `<div style="background:#dc2626;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`Destination: ${data.destination}`);

      if (driverLat && driverLng) {
        map.fitBounds([[driverLat, driverLng], [destLat, destLng]], { padding: [40, 40] });
      } else {
        map.setView([destLat, destLng], 14);
      }
    }
  };

  const updateMarkers = (data) => {
    const driverLat = data.driver?.latitude;
    const driverLng = data.driver?.longitude;
    if (driverMarkerRef.current && driverLat && driverLng) {
      driverMarkerRef.current.setLatLng([driverLat, driverLng]);
    }
  };

  const cfg = STATUS_CONFIG[delivery?.status] || STATUS_CONFIG.ASSIGNED;
  const step = cfg.step;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Tracking link not found</h1>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!delivery) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-gray-400 text-sm">Loading tracking info…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">FleetIQ Tracking</div>
            <div className="text-xs text-gray-400">Live delivery updates</div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Delivery status</p>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            </div>
            {delivery.status === 'DELIVERED' && (
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Progress steps */}
          {step > 0 && (
            <div className="flex items-center gap-1 mb-5">
              {['Assigned', 'In Transit', 'Delivered'].map((label, i) => (
                <div key={label} className="flex items-center flex-1">
                  <div className={`h-2 rounded-full flex-1 transition-all ${i + 1 <= step ? 'bg-blue-500' : 'bg-slate-100'}`} />
                  {i < 2 && <div className="w-1" />}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">📍</span>
              <div>
                <span className="text-gray-500 text-xs">Delivering to</span>
                <p className="font-semibold text-gray-800">{delivery.destination}</p>
              </div>
            </div>
            {delivery.pickupAddress && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">🏁</span>
                <div>
                  <span className="text-gray-500 text-xs">Picked up from</span>
                  <p className="font-medium text-gray-700">{delivery.pickupAddress}</p>
                </div>
              </div>
            )}
            {delivery.vehicle && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">🚛</span>
                <div>
                  <span className="text-gray-500 text-xs">Vehicle</span>
                  <p className="font-medium text-gray-700">
                    {[delivery.vehicle.color, delivery.vehicle.make, delivery.vehicle.model].filter(Boolean).join(' ')}
                    {delivery.vehicle.licensePlate && ` · ${delivery.vehicle.licensePlate}`}
                  </p>
                </div>
              </div>
            )}
            {delivery.deliveredAt && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">✅</span>
                <div>
                  <span className="text-gray-500 text-xs">Delivered at</span>
                  <p className="font-medium text-gray-700">{new Date(delivery.deliveredAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live map */}
        {delivery.status === 'IN_TRANSIT' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-50">
              <span className="text-sm font-semibold text-gray-800">Live location</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Updates every 15s
              </span>
            </div>
            <div ref={mapRef} style={{ height: '280px', width: '100%' }} />
          </div>
        )}

        {/* Proof of delivery */}
        {delivery.proofImage && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">Proof of delivery</p>
            <img src={delivery.proofImage} alt="Proof of delivery" className="w-full rounded-xl object-cover max-h-64" />
          </div>
        )}

        {/* Timeline */}
        {delivery.trackingEvents?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-4">Timeline</p>
            <div className="space-y-3">
              {delivery.trackingEvents.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    {i < delivery.trackingEvents.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{e.event.replace('_', ' ').toLowerCase()}</p>
                    {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Powered by FleetIQ</p>
      </div>
    </div>
  );
}
