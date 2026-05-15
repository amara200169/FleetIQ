'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const ROLE_BADGE = {
  ADMIN:       'bg-purple-100 text-purple-700',
  FLEET_OWNER: 'bg-blue-100   text-blue-700',
  DRIVER:      'bg-emerald-100 text-emerald-700',
};

const EMPTY_FORM = {
  email: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', licenseNumber: '',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);

  // Create driver modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState('');
  const [createMsg, setCreateMsg]   = useState('');

  // Reset password modal
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [resetMsg,    setResetMsg]    = useState('');
  const [resetErr,    setResetErr]    = useState('');
  const [resetting,   setResetting]   = useState(false);

  const fetchUsers = () =>
    api.get('/api/admin/users')
      .then((r) => { setUsers(r.data); setLoading(false); })
      .catch(() => router.push('/'));

  useEffect(() => {
    if (localStorage.getItem('role') !== 'ADMIN') { router.push('/'); return; }
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    await api.delete(`/api/admin/users/${id}`);
    fetchUsers();
  };

  const handleRoleChange = async (id, role) => {
    await api.patch(`/api/admin/users/${id}`, { role });
    fetchUsers();
  };

  // Create driver
  const openCreate = () => { setForm(EMPTY_FORM); setCreateErr(''); setCreateMsg(''); setShowCreate(true); };
  const closeCreate = () => setShowCreate(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateErr(''); setCreateMsg('');
    if (form.password !== form.confirmPassword) { setCreateErr('Passwords do not match.'); return; }
    if (form.password.length < 6) { setCreateErr('Password must be at least 6 characters.'); return; }
    setCreating(true);
    try {
      await api.post('/api/admin/users', {
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        licenseNumber: form.licenseNumber || undefined,
        role: 'DRIVER',
      });
      setCreateMsg('Driver created successfully.');
      fetchUsers();
      setTimeout(closeCreate, 1200);
    } catch (err) {
      setCreateErr(err.response?.data?.error || 'Failed to create driver.');
    } finally {
      setCreating(false);
    }
  };

  // Reset password
  const openReset  = (user) => { setResetTarget(user); setNewPassword(''); setConfirmPw(''); setResetMsg(''); setResetErr(''); };
  const closeReset = () => { setResetTarget(null); setNewPassword(''); setConfirmPw(''); };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg(''); setResetErr('');
    if (newPassword !== confirmPw) { setResetErr('Passwords do not match.'); return; }
    if (newPassword.length < 6)    { setResetErr('Minimum 6 characters.');   return; }
    setResetting(true);
    try {
      const res = await api.patch(`/api/admin/users/${resetTarget.id}/reset-password`, { newPassword });
      setResetMsg(res.data.message);
      setNewPassword(''); setConfirmPw('');
      setTimeout(closeReset, 1500);
    } catch (err) {
      setResetErr(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff}d ago`;
  };

  const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Users</h1>
            <p className="text-slate-400 text-sm mt-1">{users.length} registered accounts</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-900/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Driver
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Users table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                          {u.firstName ? u.firstName[0].toUpperCase() : u.email[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{fullName(u)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{timeAgo(u.createdAt)}</td>
                    <td className="px-5 py-4">
                      {u.role !== 'ADMIN' ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => handleRoleChange(u.id, 'FLEET_OWNER')}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                            Make Owner
                          </button>
                          <button onClick={() => handleRoleChange(u.id, 'DRIVER')}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors">
                            Make Driver
                          </button>
                          <button onClick={() => openReset(u)}
                            className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                            Reset Pwd
                          </button>
                          <button onClick={() => handleDelete(u.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create Driver Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Create Driver Account</h2>
                <p className="text-xs text-slate-400 mt-0.5">License number is visible only to fleet owners</p>
              </div>
              <button onClick={closeCreate}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createMsg && <p className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-lg">{createMsg}</p>}
              {createErr && <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{createErr}</p>}

              <div className="grid grid-cols-2 gap-3">
                {[['firstName', 'First Name', 'text', false], ['lastName', 'Last Name', 'text', false]].map(([key, label, type, required]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
                    <input
                      type={type} value={form[key]} required={required}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  placeholder="driver@company.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Driver License Number
                  <span className="ml-1.5 text-slate-300 font-normal normal-case tracking-normal">(visible to fleet owners only)</span>
                </label>
                <input type="text" value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  placeholder="e.g. DL-2025-00123" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Password <span className="text-red-400">*</span></label>
                  <input type="password" value={form.password} required minLength={6}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="Min 6 chars" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Confirm <span className="text-red-400">*</span></label>
                  <input type="password" value={form.confirmPassword} required minLength={6}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    placeholder="Repeat password" />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Driver'}
                </button>
                <button type="button" onClick={closeCreate}
                  className="px-5 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Reset Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">{resetTarget.email}</p>
              </div>
              <button onClick={closeReset}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleReset} className="px-6 py-5 space-y-4">
              {resetMsg && <p className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-lg">{resetMsg}</p>}
              {resetErr && <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{resetErr}</p>}
              {[['newPassword', 'New Password', setNewPassword, newPassword], ['confirmPw', 'Confirm Password', setConfirmPw, confirmPw]].map(([key, label, setter, val]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type="password" value={val} required minLength={6}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={resetting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </button>
                <button type="button" onClick={closeReset}
                  className="px-5 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
