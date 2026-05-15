'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

const STATUS_META = {
  PENDING:    { label: 'Pending',    bg: 'bg-slate-100',  text: 'text-slate-600',   bar: 'bg-slate-400',   dot: 'bg-slate-400' },
  ASSIGNED:   { label: 'Assigned',   bg: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500',    dot: 'bg-blue-500' },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   dot: 'bg-amber-500' },
  DELIVERED:  { label: 'Delivered',  bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  FAILED:     { label: 'Failed',     bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500',     dot: 'bg-red-500' },
  CANCELLED:  { label: 'Cancelled',  bg: 'bg-gray-100',   text: 'text-gray-500',    bar: 'bg-gray-400',    dot: 'bg-gray-400' },
};

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6" />
    </svg>
  );
}
function PackageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function KpiCard({ label, value, sub, Icon, gradient, iconBg }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white ${gradient}`}>
      <div className={`absolute top-5 right-5 w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon />
      </div>
      <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-4xl font-black tracking-tight mb-1">{value}</p>
      {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'ADMIN') { router.push('/'); return; }
    api.get('/api/admin/dashboard').then((r) => setStats(r.data)).catch(() => router.push('/'));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const totalDeliveries = stats.deliveries.reduce((s, d) => s + d.count, 0);
  const delivered = stats.deliveries.find((d) => d.status === 'DELIVERED')?.count || 0;
  const successRate = totalDeliveries ? Math.round((delivered / totalDeliveries) * 100) : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">
              {greeting} · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Full platform visibility and control</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex-shrink-0">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm font-semibold">System Online</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Users" value={stats.users.total}
            sub={`${stats.users.drivers} drivers · ${stats.users.fleet_owners} owners`}
            Icon={UsersIcon}
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            iconBg="bg-white/10"
          />
          <KpiCard
            label="Fleet Vehicles" value={stats.vehicles.total}
            sub={`${stats.vehicles.assigned} assigned · ${stats.vehicles.unassigned} idle`}
            Icon={TruckIcon}
            gradient="bg-gradient-to-br from-violet-600 to-violet-800"
            iconBg="bg-white/10"
          />
          <KpiCard
            label="Total Deliveries" value={totalDeliveries}
            sub={`${delivered} delivered successfully`}
            Icon={PackageIcon}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            iconBg="bg-white/10"
          />
          <KpiCard
            label="Success Rate" value={`${successRate}%`}
            sub="Delivery completion rate"
            Icon={ChartIcon}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
            iconBg="bg-white/10"
          />
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Delivery Status Breakdown</h2>
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{totalDeliveries} total</span>
            </div>
            <div className="space-y-4">
              {stats.deliveries.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No deliveries yet.</p>
              ) : stats.deliveries.map((d) => {
                const c = STATUS_META[d.status] || STATUS_META.PENDING;
                const pct = totalDeliveries ? Math.round((d.count / totalDeliveries) * 100) : 0;
                return (
                  <div key={d.status}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                        <span className="text-sm font-medium text-slate-700">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{d.count}</span>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform overview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Platform Overview</h2>
            <div className="space-y-4 mb-6">
              {[
                { label: 'Administrators', val: stats.users.total - stats.users.drivers - stats.users.fleet_owners, color: 'bg-violet-500' },
                { label: 'Fleet Owners',   val: stats.users.fleet_owners, color: 'bg-blue-500' },
                { label: 'Drivers',        val: stats.users.drivers,       color: 'bg-emerald-500' },
              ].map(({ label, val, color }) => {
                const pct = stats.users.total ? Math.round((val / stats.users.total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-slate-600 font-medium">{label}</span>
                      <span className="text-sm font-bold text-slate-800">{val}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-slate-100">
              {[
                { label: 'Total Vehicles',      val: stats.vehicles.total,      color: 'text-slate-800' },
                { label: 'Assigned',            val: stats.vehicles.assigned,   color: 'text-emerald-600' },
                { label: 'Idle',                val: stats.vehicles.unassigned, color: 'text-red-500' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users',   href: '/admin/users',         icon: '👥', from: 'from-blue-50',    to: 'to-blue-100',    border: 'border-blue-200',    text: 'text-blue-700' },
            { label: 'All Vehicles',   href: '/admin/vehicles',      icon: '🚛', from: 'from-violet-50',  to: 'to-violet-100',  border: 'border-violet-200',  text: 'text-violet-700' },
            { label: 'All Deliveries', href: '/admin/deliveries',    icon: '📦', from: 'from-amber-50',   to: 'to-amber-100',   border: 'border-amber-200',   text: 'text-amber-700' },
            { label: 'Assign Drivers', href: '/admin/assign-driver', icon: '🔗', from: 'from-emerald-50', to: 'to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
          ].map(({ label, href, icon, from, to, border, text }) => (
            <a key={href} href={href}
              className={`bg-gradient-to-br ${from} ${to} border ${border} rounded-2xl px-5 py-4 hover:shadow-md transition-all group`}>
              <span className="text-2xl block mb-2">{icon}</span>
              <p className={`text-sm font-bold ${text}`}>{label}</p>
              <p className={`text-xs ${text} opacity-60 mt-0.5`}>Open →</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
