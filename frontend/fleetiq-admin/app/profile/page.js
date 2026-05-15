'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    const r = localStorage.getItem('role');
    if (!r) { router.push('/'); return; }
    setRole(r);
    api.get('/api/profile').then((res) => {
      setProfile(res.data);
      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        licenseNumber: res.data.licenseNumber || '',
        licenseExpiry: res.data.licenseExpiry ? res.data.licenseExpiry.slice(0, 10) : '',
      });
    }).catch(() => router.push('/'));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const res = await api.patch('/api/profile', form);
      setProfile(res.data);
      setEditing(false);
      setMsg('Profile updated successfully.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to update profile.');
    }
  };

  const handlePw = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwErr('Passwords do not match.'); return; }
    try {
      await api.patch('/api/profile/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      setPwErr(e.response?.data?.error || 'Failed to change password.');
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarLoading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await api.post('/api/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile((p) => ({ ...p, avatar: res.data.avatar }));
    } catch (_) {}
    setAvatarLoading(false);
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email;
  const initials = profile.email.slice(0, 2).toUpperCase();

  const ROLE_BADGE = {
    ADMIN: 'bg-purple-100 text-purple-700',
    FLEET_OWNER: 'bg-blue-100 text-blue-700',
    DRIVER: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">My Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your personal information and security.</p>
      </div>

      {/* Avatar + info card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-6 mb-6">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden shadow-lg">
            {profile.avatar
              ? <img src={`${process.env.NEXT_PUBLIC_API_URL}${profile.avatar}`} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-2xl font-extrabold text-white">{initials}</span>}
          </div>
          <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm">
            {avatarLoading
              ? <svg className="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </label>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{fullName}</p>
          <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
          <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[profile.role] || 'bg-gray-100 text-gray-600'}`}>
            {profile.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-bold text-gray-800">Personal Information</h2>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition">
              Edit
            </button>
          )}
        </div>
        {msg && <p className="mb-4 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-lg">{msg}</p>}
        {err && <p className="mb-4 text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['firstName', 'First Name'], ['lastName', 'Last Name'], ['phone', 'Phone Number'], ['address', 'Address']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
              </div>
            ))}
            {role === 'DRIVER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">License Number</label>
                  <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">License Expiry</label>
                  <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['First Name', profile.firstName], ['Last Name', profile.lastName], ['Phone', profile.phone], ['Address', profile.address],
              ...(role === 'DRIVER' ? [['License Number', profile.licenseNumber], ['License Expiry', profile.licenseExpiry ? new Date(profile.licenseExpiry).toLocaleDateString() : null]] : []),
              ['Member Since', new Date(profile.createdAt).toLocaleDateString()],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800">{val || <span className="text-gray-300 italic">Not set</span>}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-800 mb-5">Change Password</h2>
        {pwMsg && <p className="mb-4 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded-lg">{pwMsg}</p>}
        {pwErr && <p className="mb-4 text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{pwErr}</p>}
        <form onSubmit={handlePw} className="space-y-4 max-w-sm">
          {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
              <input type="password" value={pwForm[key]} onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
            </div>
          ))}
          <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Update Password</button>
        </form>
      </div>
    </div>
  );
}
