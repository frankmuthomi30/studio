'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn } from 'lucide-react';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Diagnostic log to help the user verify the connected project ID.
    if (auth?.app?.options?.projectId) {
        console.log(
            `DIAGNOSTIC INFO: The application is configured to connect to Firebase project: ${auth.app.options.projectId}`
        );
    }
  }, [auth]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSigningIn(true);
    try {
      // Trim whitespace from inputs to prevent login errors due to extra spaces.
      await signInWithEmailAndPassword(auth, values.email.trim(), values.password.trim());
      toast({
        title: 'Login Successful',
        description: "Welcome back! You're now being redirected to the dashboard.",
      });
      // The auth guard will handle the redirect on user state change
    } catch (error: any) {
      let description = 'An unknown error occurred. Please check your credentials and try again.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'The email or password you entered is incorrect. Please double-check your credentials.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'The email address you entered is not valid. Please check the format.';
      } else if (error.code === 'auth/too-many-requests') {
        description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can try again later.';
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    } finally {
        setIsSigningIn(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
            <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>Enter your credentials to access the choir management system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="muthomi@school.ac.ke" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSigningIn}>
                  {isSigningIn ? <Loader2 className="animate-spin" /> : <LogIn />}
                  {isSigningIn ? 'Signing In...' : 'Login'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
         <p className="mt-4 text-center text-sm text-muted-foreground">
          To get an account, please contact the administrator.
        </p>
      </div>
    </div>
  );
}
