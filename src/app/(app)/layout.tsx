import MainSidebar from '@/components/main-sidebar';
import { MobileHeader } from '@/components/mobile-header';
import AuthGuard from './auth-guard';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full">
        <MainSidebar />
        <div className="flex flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto bg-background">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
