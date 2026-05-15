'use client';
import { useState } from 'react';
import api from '../lib/api';

export default function CreateDeliveryForm({ vehicles, onSuccess }) {
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId) return setMessage('Please select a vehicle.');
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/api/deliveries', { description, destination, vehicle: vehicleId });
      setMessage('Delivery created successfully.');
      setDescription('');
      setDestination('');
      setVehicleId('');
      if (onSuccess) onSuccess();
    } catch (err) {
      const e = err.response?.data;
      setMessage(e?.error || e?.detail || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4 max-w-lg">
      {message && <p className={`text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} required
          className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Destination (Address)</label>
        <input value={destination} onChange={(e) => setDestination(e.target.value)} required
          className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Vehicle</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required
          className="w-full border rounded p-2 text-sm">
          <option value="">-- Select vehicle --</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.model} ({v.licensePlate})</option>)}
        </select>
      </div>
      <button type="submit" disabled={submitting}
        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        {submitting ? 'Creating...' : 'Create Delivery'}
      </button>
    </form>
  );
}
