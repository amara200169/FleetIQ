'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function ManageDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Reset password state
  const [resetTarget, setResetTarget] = useState(null); // { id, email }
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchDrivers = async () => {
    const res = await api.get('/api/vehicles/drivers');
    setDrivers(res.data);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'FLEET_OWNER') { router.push('/'); return; }
    fetchDrivers().catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    try {
      const res = await api.post('/api/vehicles/drivers', { email, password });
      setMessage(`Driver "${res.data.driver.email}" created successfully.`);
      setEmail(''); setPassword('');
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create driver.');
    } finally {
      setLoading(false);
    }
  };

  const openReset = (driver) => {
    setResetTarget(driver);
    setNewPassword(''); setConfirmPw('');
    setResetMsg(''); setResetErr('');
  };

  const closeReset = () => { setResetTarget(null); setNewPassword(''); setConfirmPw(''); };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg(''); setResetErr('');
    if (newPassword !== confirmPw) { setResetErr('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setResetErr('Password must be at least 6 characters.'); return; }
    setResetting(true);
    try {
      const res = await api.patch(`/api/vehicles/drivers/${resetTarget.id}/reset-password`, { newPassword });
      setResetMsg(res.data.message);
      setNewPassword(''); setConfirmPw('');
      setTimeout(closeReset, 1500);
    } catch (err) {
      setResetErr(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Manage Drivers</h1>

        {/* Reset password modal */}
        {resetTarget && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Reset Driver Password</h2>
              <p className="text-sm text-gray-500 mb-4">{resetTarget.email}</p>

              {resetMsg && <p className="mb-3 text-sm text-green-600 font-medium">{resetMsg}</p>}
              {resetErr && <p className="mb-3 text-sm text-red-600 font-medium">{resetErr}</p>}

              <form onSubmit={handleReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resetting ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={closeReset}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create driver form */}
        <div className="bg-white rounded-xl shadow p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Create New Driver</h2>

          {message && <p className="mb-4 text-sm text-green-600 font-medium">{message}</p>}
          {error && <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>}

          <form onSubmit={handleCreate} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="driver@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Min 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Creating...' : 'Create Driver'}
            </button>
          </form>
        </div>

        {/* Driver list */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Drivers ({drivers.length})</h2>
          {drivers.length === 0 ? (
            <p className="text-gray-500 text-sm">No drivers yet. Create one above.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2 border-b">Email</th>
                  <th className="px-4 py-2 border-b">Phone</th>
                  <th className="px-4 py-2 border-b">License</th>
                  <th className="px-4 py-2 border-b">Joined</th>
                  <th className="px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b font-medium">{d.email}</td>
                    <td className="px-4 py-3 border-b text-gray-500">{d.phone || '—'}</td>
                    <td className="px-4 py-3 border-b text-gray-500">{d.licenseNumber || '—'}</td>
                    <td className="px-4 py-3 border-b text-gray-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 border-b">
                      <button
                        onClick={() => openReset(d)}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
