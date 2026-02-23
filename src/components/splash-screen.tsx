'use client';

import { Music2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [mounted, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-700">
        {/* Animated Logo Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse scale-125" />
          <div className="relative rounded-3xl bg-primary p-6 shadow-2xl shadow-primary/40 transform transition-transform hover:scale-105 duration-500">
            <Music2 className="h-16 w-16 text-primary-foreground animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Text Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-foreground font-headline animate-in slide-in-from-bottom-4 duration-1000 delay-300">
            Gatura Hub
          </h1>
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-1000 delay-500">
            <span className="h-px w-8 bg-primary/30" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              Harmony Management
            </span>
            <span className="h-px w-8 bg-primary/30" />
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-4">
          <div className="h-full bg-primary w-full animate-progress origin-left" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>
    </div>
  );
}
