'use client';

import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // While checking auth state or if user exists, show a loader.
  // This prevents a flash of the landing page before redirecting.
  if (isUserLoading || user) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-4 sm:p-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Welcome to Gatura Harmony Hub
            </h1>
            <p className="text-muted-foreground md:text-xl">
              The complete solution for managing Gatura Girls High School choir's attendance and lists.
            </p>
          </div>
          <div className="w-full space-y-4">
            <Button asChild size="lg" className="w-full">
                <Link href="/login">
                    <LogIn className="mr-2" />
                    Proceed to Login
                </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Login to access the dashboard. Please contact the administrator if you need an account.
            </p>
          </div>
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground sm:p-6">
        © {new Date().getFullYear()} Gatura Harmony Hub. All Rights Reserved.
      </footer>
    </div>
  );
}
