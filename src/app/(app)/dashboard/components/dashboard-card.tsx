import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
};

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 group border-border/50 bg-card/50 backdrop-blur-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{title}</CardTitle>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-4xl font-bold tracking-tighter mb-1.5 font-headline">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground font-medium line-clamp-1 opacity-80">{description}</p>
        )}
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <div className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center",
              trend.isPositive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}>
              {trend.value}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
