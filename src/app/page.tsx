import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-4 sm:p-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Welcome to ChoirMaster
            </h1>
            <p className="text-muted-foreground md:text-xl">
              The complete solution for managing your school choir's attendance.
            </p>
          </div>
          <div className="w-full space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/dashboard">
                Login & Access Dashboard
                <ArrowRight />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Login functionality is simulated. Click to proceed.
            </p>
          </div>
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground sm:p-6">
        © {new Date().getFullYear()} ChoirMaster. All Rights Reserved.
      </footer>
    </div>
  );
}
