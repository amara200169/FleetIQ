'use client';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

export default function BillingPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/billing/status')
      .then(r => setStatus(r.data))
      .catch(() => setError('Failed to load billing status.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setActionLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/billing/create-checkout-session');
      window.location.href = data.url;
    } catch {
      setError('Failed to start checkout. Please try again.');
      setActionLoading(false);
    }
  };

  const handleManage = async () => {
    setActionLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/billing/portal');
      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal. Please try again.');
      setActionLoading(false);
    }
  };

  const daysLeft = status?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(status.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const statusConfig = {
    trialing: { label: 'Free Trial', color: 'bg-blue-100 text-blue-700', icon: '🕐' },
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: '✓' },
    past_due: { label: 'Past Due', color: 'bg-amber-100 text-amber-700', icon: '⚠' },
    canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700', icon: '✕' },
    none: { label: 'No Subscription', color: 'bg-gray-100 text-gray-700', icon: '—' },
  };

  const cfg = statusConfig[status?.subscriptionStatus] || statusConfig.none;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <a href="/owner/dashboard" className="text-sm text-blue-600 hover:underline">&larr; Back to dashboard</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Billing & Subscription</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your FleetIQ plan.</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Plan card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Current Plan</h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mb-1">
                FleetIQ Pro
              </div>
              <div className="text-gray-400 text-sm mb-5">$29 / month — unlimited vehicles, drivers & deliveries</div>

              {status?.subscriptionStatus === 'trialing' && daysLeft !== null && (
                <div className={`rounded-xl px-4 py-3 text-sm mb-5 ${daysLeft <= 3 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {daysLeft > 0
                    ? `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Subscribe to keep access.`
                    : 'Your free trial has expired. Subscribe to restore access.'}
                </div>
              )}

              {status?.subscriptionStatus === 'past_due' && (
                <div className="rounded-xl px-4 py-3 text-sm mb-5 bg-amber-50 text-amber-700 border border-amber-200">
                  Your payment is past due. Please update your payment method.
                </div>
              )}

              {status?.subscriptionStatus === 'canceled' && (
                <div className="rounded-xl px-4 py-3 text-sm mb-5 bg-red-50 text-red-700 border border-red-200">
                  Your subscription has been canceled. Resubscribe to regain access.
                </div>
              )}

              {(status?.subscriptionStatus === 'trialing' || status?.subscriptionStatus === 'canceled' || status?.subscriptionStatus === 'none') && (
                <button onClick={handleSubscribe} disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-60">
                  {actionLoading ? 'Redirecting…' : 'Subscribe — $29/month'}
                </button>
              )}

              {(status?.subscriptionStatus === 'active' || status?.subscriptionStatus === 'past_due') && (
                <button onClick={handleManage} disabled={actionLoading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                  {actionLoading ? 'Redirecting…' : 'Manage Subscription'}
                </button>
              )}
            </div>

            {/* Features list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">What's included</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {['Unlimited vehicles & drivers', 'Real-time GPS tracking', 'Delivery management & proof of delivery', 'Fuel & maintenance logs', 'Analytics & reports', 'Email notifications', 'PWA mobile app'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
