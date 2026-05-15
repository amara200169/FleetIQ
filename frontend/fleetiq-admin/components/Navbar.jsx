'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../lib/api';

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const r = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    setRole(r);
    if (r) {
      api.get('/api/notifications').then((res) => setUnread(res.data.unreadCount)).catch(() => {});
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    router.push('/');
  };

  const lc = (href) =>
    `px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${pathname === href ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'}`;

  const notifHref = role === 'DRIVER' ? '/driver/notifications' : '/owner/notifications';

  return (
    <nav className="bg-white shadow px-4 py-3 flex justify-between items-center mb-4 sticky top-0 z-50">
      <Link href={role === 'ADMIN' ? '/dashboard' : role === 'FLEET_OWNER' ? '/owner/dashboard' : '/driver/dashboard'}
        className="text-lg font-bold text-blue-700 flex-shrink-0">
        FleetIQ
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 mx-4">
        {role === 'ADMIN' && (
          <>
            <Link href="/dashboard" className={lc('/dashboard')}>Dashboard</Link>
            <Link href="/admin/users" className={lc('/admin/users')}>Users</Link>
            <Link href="/admin/vehicles" className={lc('/admin/vehicles')}>Vehicles</Link>
            <Link href="/admin/deliveries" className={lc('/admin/deliveries')}>Deliveries</Link>
            <Link href="/admin/assign-driver" className={lc('/admin/assign-driver')}>Assign Driver</Link>
          </>
        )}
        {role === 'FLEET_OWNER' && (
          <>
            <Link href="/owner/dashboard" className={lc('/owner/dashboard')}>Dashboard</Link>
            <Link href="/owner/vehicles" className={lc('/owner/vehicles')}>Vehicles</Link>
            <Link href="/owner/drivers" className={lc('/owner/drivers')}>Drivers</Link>
            <Link href="/owner/assign-driver" className={lc('/owner/assign-driver')}>Assign</Link>
            <Link href="/owner/maintenance" className={lc('/owner/maintenance')}>Maintenance</Link>
            <Link href="/owner/fuel" className={lc('/owner/fuel')}>Fuel</Link>
            <Link href="/owner/reports" className={lc('/owner/reports')}>Reports</Link>
            <Link href="/owner/messages" className={lc('/owner/messages')}>Messages</Link>
          </>
        )}
        {role === 'DRIVER' && (
          <>
            <Link href="/driver/dashboard" className={lc('/driver/dashboard')}>Dashboard</Link>
            <Link href="/driver/fuel-log" className={lc('/driver/fuel-log')}>Fuel Log</Link>
            <Link href="/driver/messages" className={lc('/driver/messages')}>Messages</Link>
          </>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell */}
        {role && (
          <Link href={notifHref} className="relative p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded">
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )}
        {/* Profile */}
        {role && (
          <Link href="/profile" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded">
            <UserIcon />
          </Link>
        )}
        <button onClick={handleLogout} className="ml-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium">
          Logout
        </button>
      </div>

      {/* Mobile hamburger */}
      <button onClick={() => setMenuOpen((o) => !o)} className="md:hidden ml-2 p-1.5 text-gray-500 hover:bg-gray-100 rounded">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-t z-50 md:hidden">
          <div className="px-4 py-3 flex flex-col gap-1">
            {role === 'ADMIN' && (
              <>
                <Link href="/dashboard" className={lc('/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/admin/users" className={lc('/admin/users')} onClick={() => setMenuOpen(false)}>Users</Link>
                <Link href="/admin/vehicles" className={lc('/admin/vehicles')} onClick={() => setMenuOpen(false)}>Vehicles</Link>
                <Link href="/admin/deliveries" className={lc('/admin/deliveries')} onClick={() => setMenuOpen(false)}>Deliveries</Link>
                <Link href="/admin/assign-driver" className={lc('/admin/assign-driver')} onClick={() => setMenuOpen(false)}>Assign Driver</Link>
              </>
            )}
            {role === 'FLEET_OWNER' && (
              <>
                <Link href="/owner/dashboard" className={lc('/owner/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/owner/vehicles" className={lc('/owner/vehicles')} onClick={() => setMenuOpen(false)}>Vehicles</Link>
                <Link href="/owner/drivers" className={lc('/owner/drivers')} onClick={() => setMenuOpen(false)}>Drivers</Link>
                <Link href="/owner/assign-driver" className={lc('/owner/assign-driver')} onClick={() => setMenuOpen(false)}>Assign Driver</Link>
                <Link href="/owner/maintenance" className={lc('/owner/maintenance')} onClick={() => setMenuOpen(false)}>Maintenance</Link>
                <Link href="/owner/fuel" className={lc('/owner/fuel')} onClick={() => setMenuOpen(false)}>Fuel</Link>
                <Link href="/owner/reports" className={lc('/owner/reports')} onClick={() => setMenuOpen(false)}>Reports</Link>
                <Link href="/owner/messages" className={lc('/owner/messages')} onClick={() => setMenuOpen(false)}>Messages</Link>
              </>
            )}
            {role === 'DRIVER' && (
              <>
                <Link href="/driver/dashboard" className={lc('/driver/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/driver/fuel-log" className={lc('/driver/fuel-log')} onClick={() => setMenuOpen(false)}>Fuel Log</Link>
                <Link href="/driver/messages" className={lc('/driver/messages')} onClick={() => setMenuOpen(false)}>Messages</Link>
              </>
            )}
            <Link href="/profile" className={lc('/profile')} onClick={() => setMenuOpen(false)}>My Profile</Link>
            <Link href={notifHref} className={lc(notifHref)} onClick={() => setMenuOpen(false)}>Notifications {unread > 0 ? `(${unread})` : ''}</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
