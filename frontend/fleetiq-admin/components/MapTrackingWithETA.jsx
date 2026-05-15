'use client';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../lib/api';

const MAX_TRAIL = 30;
const DEFAULT_CENTER = [45.0, -93.265];
const DEFAULT_ZOOM = 10;

export default function MapTrackingWithETA({ deliveries, etaData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const trailDataRef = useRef({});
  const destMarkersRef = useRef([]);
  const addMarkerFnRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [trackedCount, setTrackedCount] = useState(0);

  // Build driver → delivery lookup for popups
  const driverDeliveryMap = {};
  deliveries.forEach((d) => {
    const dId = d.vehicle?.driver?.id ?? d.driverId;
    if (dId) driverDeliveryMap[dId] = d;
  });

  // Init map (client-only via dynamic import)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import('leaflet').then((mod) => {
      if (!mounted || !containerRef.current) return;
      const L = mod.default ?? mod;
      LRef.current = L;

      // Fix broken default icon paths in bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      // Stable function ref so socket effect can call it after map is ready
      addMarkerFnRef.current = (driverId, email, lat, lng) => {
        const driverIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#3b82f6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
          iconAnchor: [8, 8],
        });

        if (markersRef.current[driverId]) {
          markersRef.current[driverId].setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { icon: driverIcon }).addTo(map);
          const delivery = driverDeliveryMap[driverId];
          marker.bindPopup(`
            <div style="font-size:12px;min-width:150px">
              <b style="color:#1e293b">${email}</b><br/>
              ${delivery ? `<span style="color:#64748b">→ ${delivery.destination}</span><br/>` : ''}
              ${delivery && etaData[delivery.id] ? `<span style="color:#64748b">ETA: ${etaData[delivery.id]}</span><br/>` : ''}
              <span style="color:#94a3b8;font-size:11px">Live position</span>
            </div>
          `);
          markersRef.current[driverId] = marker;
        }

        // Breadcrumb trail
        if (!trailDataRef.current[driverId]) trailDataRef.current[driverId] = [];
        trailDataRef.current[driverId].push([lat, lng]);
        if (trailDataRef.current[driverId].length > MAX_TRAIL) {
          trailDataRef.current[driverId].shift();
        }
        if (trailsRef.current[driverId]) {
          trailsRef.current[driverId].setLatLngs(trailDataRef.current[driverId]);
        } else {
          trailsRef.current[driverId] = L.polyline(trailDataRef.current[driverId], {
            color: '#3b82f6', weight: 2, opacity: 0.45, dashArray: '5 5',
          }).addTo(map);
        }
      };

      // Seed current driver positions from REST
      api.get('/api/drivers/locations').then(({ data }) => {
        if (!mounted) return;
        data.forEach((d) => {
          if (d.latitude != null && d.longitude != null) {
            addMarkerFnRef.current?.(d.id, d.email, d.latitude, d.longitude);
          }
        });
        setTrackedCount(Object.keys(markersRef.current).length);
      }).catch(() => {});

      // Delivery destination markers
      deliveries.forEach((d) => {
        if (!d.latitude || !d.longitude) return;
        const color = d.status === 'DELIVERED' ? '#22c55e' : '#ef4444';
        const marker = L.circleMarker(
          [parseFloat(d.latitude), parseFloat(d.longitude)],
          { radius: 7, color, fillColor: color, fillOpacity: 0.85, weight: 2 }
        ).addTo(map);
        marker.bindPopup(`
          <div style="font-size:12px;min-width:140px">
            <b style="color:#1e293b">${d.destination}</b><br/>
            <span style="color:#64748b">Status: ${d.status.replace('_', ' ')}</span><br/>
            ${etaData[d.id] ? `<span style="color:#64748b">ETA: ${etaData[d.id]}</span>` : ''}
          </div>
        `);
        destMarkersRef.current.push(marker);
      });
    });

    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Socket — real-time driver location events
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('driver:location', ({ driverId, email, latitude, longitude }) => {
      addMarkerFnRef.current?.(driverId, email, latitude, longitude);
      setTrackedCount(Object.keys(markersRef.current).length);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs font-semibold text-slate-600">
            {connected ? 'Live — updates in real time' : 'Connecting…'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {trackedCount} driver{trackedCount !== 1 ? 's' : ''} tracked
        </span>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm" style={{ height: '460px' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Driver (live)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Delivery destination</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Delivered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-blue-400 opacity-60" />
          <span>Route trail</span>
        </div>
      </div>
    </div>
  );
}
