'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, ArrowLeft } from 'lucide-react';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function SignupPage() {

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
            <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Info className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Account Creation is Restricted</CardTitle>
            <CardDescription>
              To ensure data security and integrity, new user accounts can only be created by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
                If you need access to the ChoirMaster system, please contact <strong>Mr. Muthomi</strong> to have an account created for you.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2" />
                Back to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
