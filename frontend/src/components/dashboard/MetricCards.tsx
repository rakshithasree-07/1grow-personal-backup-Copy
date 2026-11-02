"use client";

import {
  Users, GraduationCap, Layers, Activity, Package, Truck, RefreshCw,
  CreditCard, CalendarDays, Calendar, Target, UserPlus, UserCheck,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { DashboardMetric } from "@/types/dashboard";

const ICONS: Record<string, React.ReactNode> = {
  users: <Users size={20} />,
  "graduation-cap": <GraduationCap size={20} />,
  layers: <Layers size={20} />,
  activity: <Activity size={20} />,
  package: <Package size={20} />,
  truck: <Truck size={20} />,
  "refresh-cw": <RefreshCw size={20} />,
  "credit-card": <CreditCard size={20} />,
  "calendar-days": <CalendarDays size={20} />,
  calendar: <Calendar size={20} />,
  target: <Target size={20} />,
  "user-plus": <UserPlus size={20} />,
  "user-check": <UserCheck size={20} />,
  "trending-up": <TrendingUp size={20} />,
};

function formatCurrency(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

function formatValue(metric: DashboardMetric): string | number {
  if (metric.format === "currency") return formatCurrency(Number(metric.value) || 0);
  if (metric.format === "percent") return `${metric.value}%`;
  if (metric.unit) return `${metric.value}${metric.unit}`;
  return metric.value;
}

interface MetricCardsProps {
  metrics: DashboardMetric[];
  loading?: boolean;
}

export function MetricCards({ metrics, loading }: MetricCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.key}
          title={metric.label}
          value={formatValue(metric)}
          delta={metric.delta != null ? String(metric.delta) : undefined}
          deltaType={metric.deltaType}
          icon={metric.icon ? ICONS[metric.icon] : undefined}
        />
      ))}
    </div>
  );
}
