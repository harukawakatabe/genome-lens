"use client";
import * as React from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useShallow } from "zustand/react/shallow";
import { useApp } from "@/store";
import { uid } from "@/lib/utils";
import { getConflictRules } from "@/lib/generated-loader";

export default function SupplementsPage() {
  const { supplements, report, addSupplement, removeSupplement } = useApp(
    useShallow((s) => ({
      supplements: s.supplements,
      report: s.report,
      addSupplement: s.addSupplement,
      removeSupplement: s.removeSupplement,
    })),
  );

  const sRecs = report?.recommendations.filter((r) => r.tier === "S" && r.type === "supplement") ?? [];
  const covered = sRecs.filter((r) =>
    supplements.some((s) =>
      s.ingredients.some((i) =>
        normalize(r.title).split(/\s|\//).some((kw) => normalize(i.name).includes(kw)),
      ),
    ),
  );
  const gaps = sRecs.filter((r) => !covered.includes(r));

  /**
   * 冲突检测：直接展示生成的全部规则（来自 LLM I 模块），
   * 用户的当前补剂清单作为参考显示在「触发条件」里。
   * 真实生产应做关键词匹配；MVP 先全量展示规则。
   */
  const conflicts = getConflictRules();

  return (
    <AppShell crumbs={[{ label: "仪表盘", href: "/dashboard" }, { label: "补剂" }]}>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">补剂管理</h1>
        <p className="mt-1 text-xs text-slate-500">清单 · 缺口 · 冲突</p>
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="当前补剂" value={supplements.length} />
        <Stat label="S 级已覆盖" value={`${covered.length} / ${sRecs.length}`} />
        <Stat label="S 级缺口" value={gaps.length} accent="#EA580C" />
        <Stat label="冲突警告" value={conflicts.length} accent={conflicts.length ? "#DC2626" : "#16A34A"} />
      </div>

      {conflicts.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> 冲突警告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conflicts.map((c, i) => (
              <div
                key={i}
                className={
                  "rounded-md border p-3 bg-white " +
                  (c.severity === "high"
                    ? "border-red-200"
                    : c.severity === "medium"
                      ? "border-orange-200"
                      : "border-slate-200")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-800">{c.title}</div>
                  <Badge variant={c.severity === "high" ? "high" : c.severity === "medium" ? "medium" : "outline"}>
                    {c.severity === "high" ? "高风险" : c.severity === "medium" ? "中风险" : "低风险"}
                  </Badge>
                </div>
                {c.trigger && (
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-medium">触发：</span>
                    {c.trigger}
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-700">{c.reason}</div>
                {c.suggestion && (
                  <div className="mt-1 text-xs text-primary">
                    <span className="font-medium">建议：</span>
                    {c.suggestion}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>当前清单</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              addSupplement({
                id: uid("supp"),
                brand: "新品牌",
                name: "新补剂",
                ingredients: [],
                dailyDose: "",
              })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 添加
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品牌</TableHead>
                <TableHead>产品</TableHead>
                <TableHead>主要成分</TableHead>
                <TableHead>每日剂量</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-6">
                    暂无补剂，点击上方按钮添加。
                  </TableCell>
                </TableRow>
              )}
              {supplements.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.brand}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">{s.name}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {s.ingredients.length === 0
                      ? "—"
                      : s.ingredients.map((i) => `${i.name} ${i.amount}${i.unit}`).join("、")}
                  </TableCell>
                  <TableCell className="text-xs">{s.dailyDose ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeSupplement(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>S 级推荐与缺口</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sRecs.map((r) => {
              const isCovered = covered.includes(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{r.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{r.dose}</div>
                  </div>
                  <Badge variant={isCovered ? "low" : "medium"}>
                    {isCovered ? "已覆盖" : "建议补充"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold" style={{ color: accent ?? "#1F6B4D" }}>
        {value}
      </div>
    </div>
  );
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}
