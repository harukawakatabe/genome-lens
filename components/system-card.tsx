"use client";
import Link from "next/link";
import {
  Activity,
  Brain,
  Filter,
  Flower,
  GitBranch,
  Heart,
  Pill,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, riskColor } from "@/components/risk-badge";
import { SYSTEMS } from "@/types";
import type { SystemAssessment } from "@/types";
import { useApp } from "@/store";

const ICONS: Record<string, any> = {
  Brain,
  Shield,
  GitBranch,
  Pill,
  Flower,
  Filter,
  Activity,
  Heart,
};

export function SystemCard({ s }: { s: SystemAssessment }) {
  const meta = SYSTEMS.find((x) => x.id === s.systemId)!;
  const Icon = ICONS[meta.icon] ?? Activity;
  const openLocus = useApp((st) => st.openLocus);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 min-h-[200px] flex flex-col">
      <div className="h-1" style={{ background: riskColor(s.riskLevel) }} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{meta.title}</h3>
          </div>
          <RiskBadge level={s.riskLevel} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-3">{s.oneLineSummary}</p>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {s.drivingVariants.slice(0, 3).map((v) => (
              <button
                key={v.rsid}
                onClick={(e) => {
                  e.preventDefault();
                  openLocus(v.rsid);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:border-primary hover:text-primary"
              >
                {v.rsid}
              </button>
            ))}
            {s.drivingVariants.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{s.drivingVariants.length - 3}
              </Badge>
            )}
          </div>
          <Link
            href={`/system/${s.systemId}`}
            className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1"
          >
            查看详情 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
