'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  ClipboardCheck,
  Printer,
  LogOut,
  Music,
  ClipboardList,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import Logo from './logo';
import { useAuth } from '@/firebase';
import { ThemeToggle } from './theme-toggle';

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
  const auth = useAuth();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r bg-card/50 backdrop-blur-xl md:flex shadow-2xl z-20">
      <div className="flex h-20 shrink-0 items-center px-8 border-b">
        <Logo />
      </div>
      <nav className="flex-1 space-y-2 p-6">
        <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Management</p>
        {navItems.map((item) => {
          const isActive = (pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 relative overflow-hidden',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-primary'
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-transform duration-300 group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')} />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute right-0 top-0 h-full w-1 bg-white/20" />
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto p-6 space-y-4">
        <div className="rounded-2xl bg-muted/50 p-4 border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">Switch between light and dark themes for comfort.</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}