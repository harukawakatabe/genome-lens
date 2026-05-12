"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, Download, FileText, RefreshCw, Share2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Disclaimer } from "@/components/disclaimer";
import { SystemCard } from "@/components/system-card";
import { RiskBadge } from "@/components/risk-badge";
import { useApp } from "@/store";
import { formatDate } from "@/lib/utils";
import { exportReportMarkdown, downloadFile } from "@/lib/export";
import { buildReport } from "@/lib/report-builder";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { RiskLevel } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { report, initialized, basic, supplements, labs, hla, genes, setReport, pushSnapshot, loadMock } = useApp(
    useShallow((s) => ({
      report: s.report,
      initialized: s.initialized,
      basic: s.basic,
      supplements: s.supplements,
      labs: s.labs,
      hla: s.hla,
      genes: s.genes,
      setReport: s.setReport,
      pushSnapshot: s.pushSnapshot,
      loadMock: s.loadMock,
    })),
  );
  const [regenOpen, setRegenOpen] = React.useState(false);

  React.useEffect(() => {
    if (!initialized) {
      // 默认载入 mock 而不是强制跳转，便于演示
      loadMock();
    }
  }, [initialized, loadMock]);

  if (!report) {
    return (
      <AppShell>
        <div className="text-sm text-slate-500">报告加载中…</div>
      </AppShell>
    );
  }

  const highCount = report.systems.filter((s) => s.riskLevel === "high").length;
  const medCount = report.systems.filter((s) => s.riskLevel === "medium").length;
  const sCount = report.recommendations.filter((r) => r.tier === "S" && r.type === "supplement").length;
  const monCount = report.monitoring.length;

  function doExportMd() {
    const md = exportReportMarkdown(report!);
    downloadFile(`genome-lens-${new Date().toISOString().slice(0, 10)}.md`, md);
    toast({ title: "已导出 Markdown" });
  }

  function regen() {
    const next = buildReport({
      basic: basic!,
      genes,
      hla,
      supplements,
      labs,
    });
    setReport(next);
    pushSnapshot(next);
    toast({ title: "已重新生成报告" });
    setRegenOpen(false);
  }

  return (
    <AppShell crumbs={[{ label: "仪表盘" }]}>
      {/* 顶部标题 + 操作 */}
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的遗传健康全景</h1>
          <p className="mt-1 text-xs text-slate-500">
            生成时间：{formatDate(report.generatedAt)} · 共评估 {report.genes.length} 个关键位点
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> 重新分析
          </Button>
          <Button variant="outline" size="sm" onClick={doExportMd}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> 导出 Markdown
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                <Download className="h-3.5 w-3.5 mr-1.5" /> 导出 PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>即将上线</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> 分享
              </Button>
            </TooltipTrigger>
            <TooltipContent>即将上线</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Disclaimer className="mb-6" />

      {/* 数字卡片 */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="高风险系统" value={highCount} accent="#DC2626" />
        <StatCard label="中风险系统" value={medCount} accent="#EA580C" />
        <StatCard label="S 级补剂" value={sCount} accent="#1F6B4D" />
        <StatCard label="待监测指标" value={monCount} accent="#0EA5E9" />
      </div>

      {/* 系统网格 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-slate-500">系统风险全景</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {report.systems.map((s) => (
            <SystemCard key={s.systemId} s={s} />
          ))}
        </div>
      </section>

      {/* 三列矩阵 */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>补剂矩阵</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["S", "A"]}>
              {(["S", "A", "B"] as const).map((tier) => {
                const items = report.recommendations.filter((r) => r.tier === tier && r.type === "supplement");
                return (
                  <AccordionItem key={tier} value={tier}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <Badge variant={tier === "S" ? "primary" : tier === "A" ? "info" : "outline"}>{tier} 级</Badge>
                        <span className="text-slate-500 text-xs">{items.length} 项</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {items.map((r) => (
                          <li key={r.id} className="rounded-md border border-slate-200 p-2.5">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-800">{r.title}</div>
                              {r.dose && <div className="text-xs text-slate-500">{r.dose}</div>}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {r.rationale.map((x, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {x.geneSymbol ?? x.rsid}
                                </Badge>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>监测指标</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>指标</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>最近值</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.monitoring.map((m) => {
                  const latest = m.userValues?.[0];
                  return (
                    <TableRow key={m.metric}>
                      <TableCell className="font-medium text-slate-800">{m.metric}</TableCell>
                      <TableCell className="text-xs">{m.target}</TableCell>
                      <TableCell className="text-xs">
                        {latest ? `${latest.value} ${latest.unit}` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>回避清单</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目</TableHead>
                  <TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.avoidList.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-slate-800">{a.title}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {a.rationale.map((r) => r.mechanism).join("；")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* 未覆盖位点 */}
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          重要但本次未检测到的位点（{report.appendix.uncoveredImportantRsids.length}）
        </summary>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
          {report.appendix.uncoveredImportantRsids.map((u) => (
            <li key={u.rsid} className="flex items-start gap-2">
              <AlertOctagon className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <span className="font-mono">{u.rsid}</span> —— {u.reason}
              </div>
            </li>
          ))}
        </ul>
      </details>

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重新生成报告？</DialogTitle>
            <DialogDescription>将基于当前已录入数据重新计算系统评估与推荐，原数据不变。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>取消</Button>
            <Button onClick={regen}>确认重新分析</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    in_range: { variant: "low", label: "目标内" },
    borderline: { variant: "medium", label: "边缘" },
    out_of_range: { variant: "high", label: "偏离" },
    unknown: { variant: "unknown", label: "未录入" },
  };
  const v = map[status ?? "unknown"] ?? map.unknown;
  return <Badge variant={v.variant}>{v.label}</Badge>;
}
