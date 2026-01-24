'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Upload,
  ClipboardCheck,
  Printer,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Logo from './logo';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Student Upload' },
  { href: '/choir', icon: Users, label: 'Choir Management' },
  { href: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { href: '/reports', icon: Printer, label: 'Reports' },
];

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeSheet = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
      <Logo />
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-xs p-0">
          <div className="flex h-16 items-center border-b px-6">
            <Logo />
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSheet}
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
          <div className="absolute bottom-0 w-full border-t p-4">
            <Link
              href="/"
              onClick={closeSheet}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
