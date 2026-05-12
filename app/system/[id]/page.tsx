"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, riskColor } from "@/components/risk-badge";
import { Disclaimer } from "@/components/disclaimer";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useShallow } from "zustand/react/shallow";
import { useApp } from "@/store";
import { SYSTEMS, type SystemId } from "@/types";

const SECTIONS = [
  { id: "overview", label: "概述" },
  { id: "variants", label: "位点详情" },
  { id: "mechanism", label: "机制深读" },
  { id: "cross", label: "交叉影响" },
  { id: "supp", label: "补剂策略" },
  { id: "monitor", label: "监测指标" },
  { id: "more", label: "相关阅读" },
];

const EFFECT_LABEL: Record<string, string> = { wild: "野生", hetero: "杂合", homo: "纯合", unknown: "未知" };

export default function SystemDetailPage() {
  const params = useParams<{ id: SystemId }>();
  const router = useRouter();
  const { report, openLocus, openAi } = useApp(
    useShallow((s) => ({
      report: s.report,
      openLocus: s.openLocus,
      openAi: s.openAi,
    })),
  );
  const [active, setActive] = React.useState("overview");

  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const v = entries.find((e) => e.isIntersecting);
        if (v) setActive(v.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [report]);

  if (!report || !params?.id) {
    return (
      <AppShell>
        <div className="text-sm text-slate-500">加载中…</div>
      </AppShell>
    );
  }

  const sys = report.systems.find((x) => x.systemId === params.id);
  const meta = SYSTEMS.find((s) => s.id === params.id);
  if (!sys || !meta) {
    return (
      <AppShell crumbs={[{ label: "仪表盘", href: "/dashboard" }, { label: "未知系统" }]}>
        <div className="text-sm text-slate-500">系统未找到。</div>
      </AppShell>
    );
  }

  const variants = report.genes.filter((g) => g.system === sys.systemId);
  const recsForSys = report.recommendations.filter((r) => r.appliesToSystems.includes(sys.systemId));
  const sBundle = {
    must: recsForSys.filter((r) => r.tier === "S" && r.type === "supplement"),
    form: recsForSys.filter((r) => r.tier === "A" && r.type === "supplement"),
    support: recsForSys.filter((r) => r.tier === "B" && r.type === "supplement"),
    avoid: report.avoidList.filter((r) => r.appliesToSystems.includes(sys.systemId)),
  };

  return (
    <AppShell
      crumbs={[
        { label: "仪表盘", href: "/dashboard" },
        { label: meta.title },
      ]}
      fluid
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> 返回
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAi({ systemId: sys.systemId, topic: "mechanism" })}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> 就本系统追问
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden mb-6">
          <div className="absolute left-0 top-0 h-1 w-full" style={{ background: riskColor(sys.riskLevel) }} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">{meta.description}</div>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{meta.title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-2xl">{sys.oneLineSummary}</p>
            </div>
            <RiskBadge level={sys.riskLevel} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* 概述 */}
            <section id="overview">
              <Card>
                <CardHeader>
                  <CardTitle>概述</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>{sys.narrative}</p>
                  {sys.drivingVariants.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1.5">关键交叉位点</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sys.drivingVariants.map((v) => (
                          <button
                            key={v.rsid}
                            onClick={() => openLocus(v.rsid)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono hover:border-primary hover:text-primary"
                          >
                            {v.rsid}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* 位点详情 */}
            <section id="variants">
              <Card>
                <CardHeader>
                  <CardTitle>位点详情</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>rsid</TableHead>
                        <TableHead>基因</TableHead>
                        <TableHead>变异</TableHead>
                        <TableHead>我的分型</TableHead>
                        <TableHead>效应</TableHead>
                        <TableHead>注释</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((g) => (
                        <TableRow
                          key={g.rsid}
                          id={g.rsid}
                          className="cursor-pointer"
                          onClick={() => openLocus(g.rsid)}
                        >
                          <TableCell className="font-mono text-xs">{g.rsid}</TableCell>
                          <TableCell className="font-medium text-slate-800">{g.geneSymbol}</TableCell>
                          <TableCell className="text-xs">{g.variantName ?? "—"}</TableCell>
                          <TableCell className="font-mono">{g.genotype}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                g.effectType === "homo"
                                  ? "high"
                                  : g.effectType === "hetero"
                                    ? "medium"
                                    : g.effectType === "wild"
                                      ? "low"
                                      : "unknown"
                              }
                            >
                              {EFFECT_LABEL[g.effectType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-md">{g.annotation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            {/* 机制深读 */}
            <section id="mechanism">
              <Card>
                <CardHeader>
                  <CardTitle>机制深读</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose-medical">
                    <p>{sys.narrative}</p>
                    <p>
                      （占位）真实版本可由 <code className="text-xs bg-slate-100 px-1 rounded">content/systems/{sys.systemId}.mdx</code>{" "}
                      内容驱动，由 03_内容生成提示词 填充。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 交叉影响 */}
            <section id="cross">
              <Card>
                <CardHeader>
                  <CardTitle>与其他系统的交叉影响</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {sys.crossSystemLinks.map((c, i) => {
                      const other = SYSTEMS.find((x) => x.id === c.systemId);
                      return (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-md border border-slate-200 p-3"
                        >
                          <Link
                            href={`/system/${c.systemId}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {other?.title ?? c.systemId}
                          </Link>
                          <Badge variant={c.relation === "synergy" ? "high" : "info"}>
                            {c.relation === "synergy" ? "协同" : "拮抗"}
                          </Badge>
                          <p className="flex-1 text-xs text-slate-600">{c.mechanism}</p>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* 补剂策略 */}
            <section id="supp">
              <Card>
                <CardHeader>
                  <CardTitle>补剂策略</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={["must", "form"]}>
                    <SuppGroup id="must" label="必须补充" color="red" items={sBundle.must} onAsk={(r) => openAi({ systemId: sys.systemId, topic: "dose" })} />
                    <SuppGroup id="form" label="需选对形式" color="orange" items={sBundle.form} onAsk={(r) => openAi({ systemId: sys.systemId, topic: "alternatives" })} />
                    <SuppGroup id="support" label="支持系统" color="blue" items={sBundle.support} onAsk={(r) => openAi({ systemId: sys.systemId, topic: "mechanism" })} />
                    <SuppGroup id="avoid" label="需要警惕 / 回避" color="gray" items={sBundle.avoid} onAsk={(r) => openAi({ systemId: sys.systemId, topic: "risk" })} />
                  </Accordion>
                </CardContent>
              </Card>
            </section>

            {/* 监测 */}
            <section id="monitor">
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
                        <TableHead>频率</TableHead>
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <section id="more">
              <Card>
                <CardHeader>
                  <CardTitle>相关阅读</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SYSTEMS.filter((s) => s.id !== sys.systemId)
                    .slice(0, 4)
                    .map((o) => (
                      <Link
                        key={o.id}
                        href={`/system/${o.id}`}
                        className="rounded-md border border-slate-200 p-3 hover:border-primary"
                      >
                        <div className="text-sm font-medium text-slate-800">{o.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{o.description}</div>
                      </Link>
                    ))}
                </CardContent>
              </Card>
              <Disclaimer className="mt-6" />
            </section>
          </div>

          <aside className="hidden lg:block col-span-4">
            <div className="sticky top-16 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 mb-2">本页目录</div>
              <ul className="space-y-1.5 text-sm">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={
                        active === s.id
                          ? "text-primary font-medium"
                          : "text-slate-600 hover:text-slate-900"
                      }
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function SuppGroup({
  id,
  label,
  color,
  items,
  onAsk,
}: {
  id: string;
  label: string;
  color: "red" | "orange" | "blue" | "gray";
  items: any[];
  onAsk: (r: any) => void;
}) {
  const borderClass = {
    red: "border-l-red-400",
    orange: "border-l-orange-400",
    blue: "border-l-blue-400",
    gray: "border-l-slate-400",
  }[color];
  return (
    <AccordionItem value={id}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          {label} <span className="text-xs text-slate-500">{items.length}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {items.length === 0 ? (
          <div className="text-xs text-slate-400">无</div>
        ) : (
          <ul className="space-y-2">
            {items.map((r: any) => (
              <li key={r.id} className={`rounded-md border border-slate-200 border-l-4 ${borderClass} p-3`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-800">{r.title}</div>
                  <Button variant="ghost" size="sm" onClick={() => onAsk(r)}>
                    <MessageSquare className="h-3 w-3 mr-1" /> 和 AI 讨论
                  </Button>
                </div>
                {r.dose && <div className="text-xs text-slate-500 mt-0.5">{r.dose}</div>}
                <div className="mt-1 text-xs text-slate-600">
                  {r.rationale.map((x: any, i: number) => (
                    <span key={i} className="mr-2">
                      {x.geneSymbol ?? x.rsid} · {x.mechanism}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
