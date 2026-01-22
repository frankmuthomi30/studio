import { Music2 } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary">
      <div className="rounded-lg bg-primary p-2">
        <Music2 className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground">
        ChoirMaster
      </span>
    </Link>
  );
}
