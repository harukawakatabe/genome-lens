"use client";
import * as React from "react";
import { Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store";
import { formatDate } from "@/lib/utils";
import { SYSTEMS } from "@/types";
import { RiskBadge } from "@/components/risk-badge";

export default function HistoryPage() {
  const history = useApp((s) => s.history);
  const [active, setActive] = React.useState<string | null>(null);
  const current = history.find((h) => h.id === active) ?? history[0];

  return (
    <AppShell crumbs={[{ label: "仪表盘", href: "/dashboard" }, { label: "历史" }]}>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">历史报告</h1>
        <p className="mt-1 text-xs text-slate-500">查看多次分析的快照</p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">暂无历史快照。</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setActive(h.id)}
                className={
                  "w-full text-left rounded-xl border bg-white p-3 shadow-sm transition-colors " +
                  (current?.id === h.id ? "border-primary ring-1 ring-primary/30" : "border-slate-200 hover:border-slate-300")
                }
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {formatDate(h.generatedAt)}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {h.riskSummary.slice(0, 4).map((r) => (
                    <Badge
                      key={r.systemId}
                      variant={
                        r.risk === "high"
                          ? "high"
                          : r.risk === "medium"
                            ? "medium"
                            : r.risk === "low"
                              ? "low"
                              : "unknown"
                      }
                    >
                      {SYSTEMS.find((s) => s.id === r.systemId)?.shortTitle ?? r.systemId}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div className="col-span-12 md:col-span-8">
            {current && (
              <Card>
                <CardHeader>
                  <CardTitle>{formatDate(current.generatedAt)} · 快照只读视图</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {current.report.systems.map((s) => (
                      <div key={s.systemId} className="rounded-md border border-slate-200 p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-700">
                            {SYSTEMS.find((x) => x.id === s.systemId)?.title}
                          </div>
                          <RiskBadge level={s.riskLevel} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
