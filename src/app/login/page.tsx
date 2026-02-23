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
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
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
      await signInWithEmailAndPassword(auth, values.email.trim(), values.password.trim());
      toast({
        title: 'Login Successful',
        description: "Welcome back! Accessing the Hub...",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'The credentials entered were incorrect. Please try again.',
      });
    } finally {
        setIsSigningIn(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm font-bold text-primary animate-pulse tracking-widest uppercase">Authorizing...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 md:p-8">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
            <Logo />
            <h1 className="text-3xl font-bold mt-6 tracking-tight">Staff Portal</h1>
            <p className="text-muted-foreground text-sm max-w-sm">Secure access for Gatura Girls High School Choir Management System.</p>
        </div>

        <Card className="border-none shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your school credentials below.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                            type="email" 
                            placeholder="muthomi@school.ac.ke" 
                            className="bg-muted/50 border-none h-12 rounded-xl focus-visible:ring-primary/20" 
                            {...field} 
                        />
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Password</FormLabel>
                      <FormControl>
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="bg-muted/50 border-none h-12 rounded-xl focus-visible:ring-primary/20"
                            {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" disabled={isSigningIn}>
                  {isSigningIn ? <Loader2 className="animate-spin" /> : <LogIn className="h-5 w-5 mr-2" />}
                  {isSigningIn ? 'Verifying...' : 'Access Hub'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-xs font-medium">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}