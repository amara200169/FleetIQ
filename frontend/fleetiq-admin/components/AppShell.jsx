'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const NO_SIDEBAR_PREFIXES = ['/', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/track/'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  if (NO_SIDEBAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
