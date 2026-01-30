'use client';

import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { ArrowRight, Loader2, LogIn, UserPlus } from 'lucide-react';
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
              Welcome to Gatura Girls Choir
            </h1>
            <p className="text-muted-foreground md:text-xl">
              The complete solution for managing your school choir's attendance.
            </p>
          </div>
          <div className="w-full space-y-4">
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button asChild size="lg" variant="outline">
                    <Link href="/login">
                        <LogIn />
                        Login
                    </Link>
                </Button>
                <Button asChild size="lg">
                    <Link href="/signup">
                        <UserPlus />
                        Sign Up
                    </Link>
                </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Login to access the dashboard or Sign Up to create a new account.
            </p>
          </div>
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground sm:p-6">
        © {new Date().getFullYear()} Gatura Girls Choir. All Rights Reserved.
      </footer>
    </div>
  );
}
