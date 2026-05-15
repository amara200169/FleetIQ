'use client';
import { useEffect, useRef, useState } from 'react';

export default function DriverDeliveryMap({ delivery, driverLocation, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    const init = async () => {
      const mod = await import('leaflet');
      const L = mod.default ?? mod;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Resolve destination coordinates — use stored ones or geocode via Nominatim
      let destLat = delivery.latitude ? parseFloat(delivery.latitude) : null;
      let destLng = delivery.longitude ? parseFloat(delivery.longitude) : null;

      if (!destLat || !destLng) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(delivery.destination)}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const geoData = await geoRes.json();
          if (geoData[0]) {
            destLat = parseFloat(geoData[0].lat);
            destLng = parseFloat(geoData[0].lon);
          }
        } catch {}
      }

      if (!mounted) return;

      if (!destLat || !destLng) {
        setError('Could not resolve destination coordinates.');
        setLoading(false);
        return;
      }

      const startLat = driverLocation?.lat ?? destLat;
      const startLng = driverLocation?.lng ?? destLng;
      const hasDriverLocation = !!(driverLocation?.lat && driverLocation?.lng);

      const map = L.map(containerRef.current).setView([destLat, destLng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      // Driver position marker
      if (hasDriverLocation) {
        const driverIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5)"></div>`,
          iconAnchor: [8, 8],
        });
        L.marker([startLat, startLng], { icon: driverIcon }).addTo(map)
          .bindPopup('<b>Your location</b>');
      }

      // Destination marker
      const destIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:24px;height:36px">
            <svg viewBox="0 0 24 36" fill="#ef4444" xmlns="http://www.w3.org/2000/svg" style="width:24px;height:36px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"/>
            </svg>
            <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:white;border-radius:50%"></div>
          </div>`,
        iconAnchor: [12, 36],
      });
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map)
        .bindPopup(`<b>${delivery.destination}</b>`).openPopup();

      // Fetch OSRM route (free, no API key)
      if (hasDriverLocation) {
        try {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
          );
          const osrmData = await osrmRes.json();

          if (mounted && osrmData.routes?.[0]) {
            const route = osrmData.routes[0];
            const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

            // Draw route polyline
            L.polyline(coords, { color: '#3b82f6', weight: 5, opacity: 0.75 }).addTo(map);

            // Fit both points in view
            map.fitBounds(L.latLngBounds([[startLat, startLng], [destLat, destLng]]).pad(0.25));

            const mins = Math.round(route.duration / 60);
            setEta(mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`);
            setDistance((route.distance / 1000).toFixed(1) + ' km');
          }
        } catch {}
      } else {
        map.setView([destLat, destLng], 14);
      }

      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.destination)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Route to destination</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{delivery.destination}</p>
            {!loading && (eta || distance) && (
              <div className="flex items-center gap-3 mt-1.5">
                {eta && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {eta}
                  </span>
                )}
                {distance && <span className="text-xs text-slate-400 font-medium">{distance}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 flex-shrink-0 transition-colors">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map */}
        <div style={{ height: '380px' }} className="relative bg-slate-100">
          {loading && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Calculating route…</p>
              </div>
            </div>
          )}
          {error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-slate-400 text-center px-8">{error}</p>
            </div>
          ) : (
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Open in Google Maps
          </a>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
