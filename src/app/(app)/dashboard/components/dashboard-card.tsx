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
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group border-border/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className="rounded-full bg-primary/10 p-2 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        )}
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              trend.isPositive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {trend.value}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}