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
} from 'lucide-react';

import { cn } from '@/lib/utils';
import Logo from './logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Student Upload' },
  { href: '/choir', icon: Users, label: 'Choir Management' },
  { href: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { href: '/reports', icon: Printer, label: 'Reports' },
];

export default function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-col border-r bg-card transition-all duration-300 ease-in-out hover:w-64">
      <div className="flex h-16 shrink-0 items-center overflow-hidden px-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-2 overflow-hidden px-2 py-4">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-12 items-center gap-4 rounded-lg px-4 text-card-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground',
                    pathname.startsWith(item.href) &&
                      (item.href !== '/dashboard' || pathname === '/dashboard')
                      ? 'bg-primary/10 text-primary'
                      : ''
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  <span className="truncate text-sm font-medium">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="hidden group-hover:block"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      <div className="mt-auto space-y-2 overflow-hidden p-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className="flex h-12 items-center gap-4 rounded-lg px-4 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-6 w-6 shrink-0" />
                <span className="truncate text-sm font-medium">Logout</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden group-hover:block">
              Logout
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
