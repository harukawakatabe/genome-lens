"use client";
import * as React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/store";
import { uid } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const FILTERS = ["全部", "异常", "正常", "未录入"] as const;

export default function MonitoringPage() {
  const { report, labs, addLab, removeLab } = useApp((s) => ({
    report: s.report,
    labs: s.labs,
    addLab: s.addLab,
    removeLab: s.removeLab,
  }));
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("全部");
  const [openRow, setOpenRow] = React.useState<string | null>(null);

  if (!report) return <AppShell><div className="text-sm text-slate-500">加载中…</div></AppShell>;

  const monitoring = report.monitoring;
  const filtered = monitoring.filter((m) => {
    if (filter === "全部") return true;
    if (filter === "未录入") return !m.userValues || m.userValues.length === 0;
    if (filter === "异常") return m.status === "out_of_range" || m.status === "borderline";
    return m.status === "in_range";
  });

  return (
    <AppShell crumbs={[{ label: "仪表盘", href: "/dashboard" }, { label: "监测" }]}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">监测追踪</h1>
          <p className="mt-1 text-xs text-slate-500">体检指标与目标值对照</p>
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "rounded-md border border-primary bg-primary/10 text-primary text-xs px-2.5 py-1"
                  : "rounded-md border border-slate-200 bg-white text-slate-600 text-xs px-2.5 py-1 hover:border-slate-300"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>指标</TableHead>
                <TableHead>目标范围</TableHead>
                <TableHead>频率</TableHead>
                <TableHead>最近值</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>趋势</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const userVals = m.userValues ?? [];
                const latest = userVals[0];
                const trend = userVals
                  .slice()
                  .reverse()
                  .map((v, i) => ({ i, v: v.value }));
                const expanded = openRow === m.metric;
                return (
                  <React.Fragment key={m.metric}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setOpenRow(expanded ? null : m.metric)}
                    >
                      <TableCell className="font-medium text-slate-800">{m.metric}</TableCell>
                      <TableCell className="text-xs">{m.target}</TableCell>
                      <TableCell className="text-xs">{m.frequency}</TableCell>
                      <TableCell className="text-xs">
                        {latest ? `${latest.value} ${latest.unit}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.status === "in_range"
                              ? "low"
                              : m.status === "borderline"
                                ? "medium"
                                : m.status === "out_of_range"
                                  ? "high"
                                  : "unknown"
                          }
                        >
                          {m.status === "in_range"
                            ? "目标内"
                            : m.status === "borderline"
                              ? "边缘"
                              : m.status === "out_of_range"
                                ? "偏离"
                                : "未录入"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-20">
                          {trend.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trend}>
                                <YAxis domain={["dataMin", "dataMax"]} hide />
                                <Line
                                  type="monotone"
                                  dataKey="v"
                                  stroke="#1F6B4D"
                                  strokeWidth={1.5}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-[10px] text-slate-400">数据不足</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500">
                        {expanded ? "收起" : "展开"}
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-slate-50">
                          <div className="p-3 space-y-3">
                            <div className="text-xs text-slate-600">{m.rationale}</div>
                            {userVals.length > 0 && (
                              <ul className="text-xs text-slate-700 space-y-1">
                                {userVals.map((v) => (
                                  <li key={v.id} className="flex items-center justify-between">
                                    <span>
                                      {v.measuredAt} · <strong>{v.value}</strong> {v.unit}
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeLab(v.id); }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <AddLabValueForm metric={m.metric} unit={latest?.unit ?? ""} onAdd={(v, u, d) => {
                              addLab({ id: uid("lab"), metric: m.metric, value: v, unit: u, measuredAt: d });
                              toast({ title: `${m.metric} 已录入`, description: `${v} ${u}` });
                            }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function AddLabValueForm({
  metric,
  unit,
  onAdd,
}: {
  metric: string;
  unit: string;
  onAdd: (value: number, unit: string, date: string) => void;
}) {
  const [v, setV] = React.useState("");
  const [u, setU] = React.useState(unit);
  const [d, setD] = React.useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
      <Input placeholder="数值" type="number" value={v} onChange={(e) => setV(e.target.value)} />
      <Input placeholder="单位" value={u} onChange={(e) => setU(e.target.value)} />
      <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
      <Button
        size="sm"
        onClick={() => {
          const n = Number(v);
          if (!Number.isFinite(n)) return;
          onAdd(n, u, d);
          setV("");
        }}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> 新增
      </Button>
    </div>
  );
}
