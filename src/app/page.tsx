'use client';

import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { LogIn } from 'lucide-react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import SplashScreen from '@/components/splash-screen';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
      return <SplashScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      <header className="p-6 md:p-8">
        <Logo />
      </header>
      
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden -z-10 opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="space-y-4">
            <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
              Gatura <span className="text-primary">Harmony Hub</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-lg mx-auto font-medium">
              The premier school platform for managing the Gatura Girls High School choir records and attendance.
            </p>
          </div>
          
          <div className="w-full max-w-sm space-y-4">
            <Button asChild size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
                <Link href="/login">
                    <LogIn className="mr-2 h-5 w-5" />
                    Proceed to Portal
                </Link>
            </Button>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">
              Authorized Staff Access Only
            </p>
          </div>
        </div>
      </main>
      
      <footer className="p-8 text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] sm:p-10">
        © {new Date().getFullYear()} Gatura Girls High School. All Rights Reserved.
      </footer>
    </div>
  );
}
