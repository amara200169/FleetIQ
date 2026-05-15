'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../lib/api';

/* ── Icons ── */
const I = (d) => ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const HomeIcon      = I('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6');
const UsersIcon     = I('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z');
const TruckIcon     = I('M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h9.5M13 16H8m5 0l3-5h2.5l1.5 3v2H18M5 5h6');
const PackageIcon   = I('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10');
const AssignIcon    = I('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4');
const WrenchIcon    = I('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z');
const FuelIcon      = I('M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z');
const ChartIcon     = I('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z');
const ChatIcon      = I('M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z');
const BellIcon      = I('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9');
const UserIcon      = I('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');
const LogoutIcon    = I('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1');
const MenuIcon      = I('M4 6h16M4 12h16M4 18h16');
const CloseIcon     = I('M6 18L18 6M6 6l12 12');

/* ── Nav config ── */
const NAV = {
  ADMIN: [
    {
      group: 'Platform',
      items: [
        { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
        { href: '/admin/users', label: 'Users', Icon: UsersIcon },
        { href: '/admin/vehicles', label: 'Vehicles', Icon: TruckIcon },
        { href: '/admin/deliveries', label: 'Deliveries', Icon: PackageIcon },
        { href: '/admin/assign-driver', label: 'Assign Driver', Icon: AssignIcon },
      ],
    },
  ],
  FLEET_OWNER: [
    {
      group: 'Operations',
      items: [
        { href: '/owner/dashboard', label: 'Dashboard', Icon: HomeIcon },
        { href: '/owner/vehicles', label: 'Vehicles', Icon: TruckIcon },
        { href: '/owner/drivers', label: 'Drivers', Icon: UsersIcon },
        { href: '/owner/assign-driver', label: 'Assign Driver', Icon: AssignIcon },
      ],
    },
    {
      group: 'Fleet Management',
      items: [
        { href: '/owner/maintenance', label: 'Maintenance', Icon: WrenchIcon },
        { href: '/owner/fuel', label: 'Fuel Logs', Icon: FuelIcon },
        { href: '/owner/reports', label: 'Reports', Icon: ChartIcon },
        { href: '/owner/messages', label: 'Messages', Icon: ChatIcon },
      ],
    },
  ],
  DRIVER: [
    {
      group: 'My Work',
      items: [
        { href: '/driver/dashboard', label: 'Dashboard', Icon: HomeIcon },
        { href: '/driver/fuel-log', label: 'Fuel Log', Icon: FuelIcon },
        { href: '/driver/messages', label: 'Messages', Icon: ChatIcon },
      ],
    },
  ],
};

const ROLE_STYLES = {
  ADMIN:       'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  FLEET_OWNER: 'bg-blue-500/20   text-blue-300   border border-blue-500/30',
  DRIVER:      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
};

function NavContent({ role, pathname, email, unread, onNav, onLogout }) {
  const groups = NAV[role] || [];
  const notifHref = role === 'DRIVER' ? '/driver/notifications' : role === 'ADMIN' ? '/dashboard' : '/owner/notifications';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
          <TruckIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white tracking-tight leading-none">FleetIQ</span>
          {role && (
            <span className={`block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${ROLE_STYLES[role]}`}>
              {role.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link href={href} onClick={onNav}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}>
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link href={notifHref} onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            pathname === notifHref ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}>
          <BellIcon className="w-[18px] h-[18px] flex-shrink-0" />
          <span className="flex-1">Notifications</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <Link href="/profile" onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            pathname === '/profile' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}>
          <UserIcon className="w-[18px] h-[18px] flex-shrink-0" />
          <span className="truncate">{email || 'Profile'}</span>
        </Link>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogoutIcon className="w-[18px] h-[18px] flex-shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const r = localStorage.getItem('role');
    setRole(r);
    if (r) {
      api.get('/api/profile').then((res) => setEmail(res.data.email)).catch(() => {});
      api.get('/api/notifications').then((res) => setUnread(res.data.unreadCount)).catch(() => {});
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    router.push('/');
  };

  const props = { role, pathname, email, unread, onNav: () => setOpen(false), onLogout: handleLogout };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-slate-900 border-b border-white/10 flex items-center px-4 gap-3">
        <button onClick={() => setOpen(!open)} className="p-1 text-slate-400 hover:text-white">
          {open ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <TruckIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">FleetIQ</span>
        </div>
        {unread > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        )}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-64 h-full bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <NavContent {...props} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-slate-900 flex-col h-screen sticky top-0">
        <NavContent {...props} />
      </aside>
    </>
  );
}
