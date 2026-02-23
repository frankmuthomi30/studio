import { Music2 } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 group">
      <div className="rounded-xl bg-primary p-2.5 shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Music2 className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">
          Gatura
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-0.5">
          Harmony Hub
        </span>
      </div>
    </Link>
  );
}