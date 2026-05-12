"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { useApp } from "@/store";
import { SYSTEMS } from "@/types";

const EFFECT_LABEL: Record<string, string> = { wild: "野生型", hetero: "杂合", homo: "纯合", unknown: "未知" };

export function LocusDrawer() {
  const { locusOpen, closeLocus, locusRsid, report, openAi } = useApp(
    useShallow((s) => ({
      locusOpen: s.locusOpen,
      closeLocus: s.closeLocus,
      locusRsid: s.locusRsid,
      report: s.report,
      openAi: s.openAi,
    })),
  );

  const gene = locusRsid && report ? report.genes.find((g) => g.rsid === locusRsid) : undefined;
  const sys = gene ? SYSTEMS.find((s) => s.id === gene.system) : undefined;
  const recs = gene && report
    ? report.recommendations.filter((r) =>
        r.rationale.some((ra) => ra.rsid === gene.rsid || ra.geneSymbol === gene.geneSymbol),
      )
    : [];

  return (
    <Sheet open={locusOpen} onOpenChange={(o) => !o && closeLocus()}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>
            {gene ? `${gene.geneSymbol} · ${gene.rsid}` : "位点详情"}
          </SheetTitle>
          {gene && (
            <SheetDescription>{gene.variantName ?? gene.geneSymbol}</SheetDescription>
          )}
        </SheetHeader>

        {gene ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <section className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">所属系统</div>
                  <div className="mt-0.5">{sys?.title ?? gene.system}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">我的分型</div>
                  <div className="mt-0.5 font-medium">{gene.genotype}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">效应类型</div>
                  <div className="mt-0.5">
                    <Badge variant={gene.effectType === "homo" ? "high" : gene.effectType === "hetero" ? "medium" : "low"}>
                      {EFFECT_LABEL[gene.effectType]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">变异名</div>
                  <div className="mt-0.5">{gene.variantName ?? "—"}</div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-xs font-medium text-slate-500 mb-1.5">注释</div>
              <p className="text-sm text-slate-700 leading-relaxed">{gene.annotation}</p>
            </section>

            <section>
              <div className="text-xs font-medium text-slate-500 mb-2">本位点驱动的推荐</div>
              {recs.length === 0 ? (
                <div className="text-xs text-slate-400">暂无</div>
              ) : (
                <ul className="space-y-2">
                  {recs.map((r) => (
                    <li key={r.id} className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-800">{r.title}</div>
                        <Badge variant={r.tier === "S" ? "primary" : r.tier === "A" ? "info" : "outline"}>
                          {r.tier} 级
                        </Badge>
                      </div>
                      {r.dose && <div className="mt-1 text-xs text-slate-500">{r.dose}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-between"
                onClick={() => {
                  openAi({ systemId: gene.system, geneSymbol: gene.geneSymbol, rsid: gene.rsid, topic: "mechanism" });
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  和 AI 讨论此位点
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              {sys && (
                <Link
                  href={`/system/${sys.id}#${gene.rsid}`}
                  className="text-sm text-primary hover:underline"
                  onClick={closeLocus}
                >
                  查看完整解读 →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-500">未选择位点。</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
