'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Upload,
  ClipboardCheck,
  Printer,
  LogOut,
  Music,
  ClipboardList,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import Logo from './logo';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Student Upload' },
  { href: '/choir', icon: Music, label: 'Choirs' },
  { href: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { href: '/reports', icon: Printer, label: 'Reports' },
  { href: '/list-builder', icon: ClipboardList, label: 'List Builder' },
];

export default function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary',
              (pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href)
                ? 'bg-muted text-primary'
                : ''
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </aside>
  );
}
