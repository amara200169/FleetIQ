'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-gradient-to-br from-blue-700 to-blue-900 p-10 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6" />
            </svg>
          </div>
          <span className="text-lg font-bold">FleetIQ</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight mb-4">Run your fleet smarter, not harder.</h2>
          <p className="text-blue-200 text-sm mb-8">Everything you need to manage vehicles, drivers, and deliveries in one place.</p>

          <ul className="space-y-4">
            {[
              { icon: '📍', text: 'Real-time GPS tracking for every vehicle' },
              { icon: '📦', text: 'Delivery management with proof of delivery' },
              { icon: '🔔', text: 'Live tracking links sent to your customers' },
              { icon: '📊', text: 'Fuel, maintenance & analytics dashboard' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-blue-100">
                <span className="text-xl">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-sm text-white font-medium">"FleetIQ cut our delivery disputes by 80% in the first month."</p>
          <p className="text-blue-300 text-xs mt-2">— Fleet Operations Manager</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">FleetIQ</span>
          </div>

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            7-day free trial — no credit card required
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm mb-6">Start managing your fleet in minutes. All features unlocked.</p>

          {error && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
                <input type="text" value={form.firstName} onChange={set('firstName')} required placeholder="John"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
                <input type="text" value={form.lastName} onChange={set('lastName')} required placeholder="Doe"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work email</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@company.com"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={set('password')} required placeholder="Min. 8 characters"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required placeholder="Repeat password"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-60 mt-2">
              {loading ? 'Creating account…' : 'Start free trial →'}
            </button>

            <p className="text-center text-xs text-gray-400">No credit card required · Cancel anytime</p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/" className="text-blue-600 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
