/**
 * 统一加载 content/generated/*.json，做字段标准化与 systemId 归一化。
 * 真实内容由 scripts/generate-content.mjs 通过 LLM 生成。
 */
import type { SystemId, Tier, Recommendation, MonitoringMetric } from "@/types";

import F from "@/content/generated/F-summaries.json";
import A from "@/content/generated/A-narratives.json";
import B from "@/content/generated/B-annotations.json";
import C from "@/content/generated/C-supplements.json";
import D from "@/content/generated/D-monitoring.json";
import E from "@/content/generated/E-cross-system.json";
import H from "@/content/generated/H-uncovered.json";
import I from "@/content/generated/I-conflicts.json";

// ---------- systemId 归一化 ----------
const SYSTEM_ALIAS: Record<string, SystemId> = {
  neuro: "neuro",
  nervous_system: "neuro",
  nervous: "neuro",
  brain: "neuro",
  inflammation: "inflammation",
  immune: "inflammation",
  immunity: "inflammation",
  methylation: "methylation",
  vitamin: "vitamin",
  vitamins: "vitamin",
  estrogen: "estrogen",
  hormonal: "estrogen",
  detox: "detox",
  detoxification: "detox",
  oxidation: "detox",
  neurotransmitter: "neurotransmitter",
  neurotransmitters: "neurotransmitter",
  cardio: "cardio",
  cardiovascular: "cardio",
  metabolism: "cardio",
  metabolic: "cardio",
};

function normalizeSystem(s: string): SystemId | null {
  if (!s) return null;
  return SYSTEM_ALIAS[s.toLowerCase()] ?? null;
}

function normalizeSystems(arr: unknown): SystemId[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? normalizeSystem(x) : null))
    .filter((x): x is SystemId => x !== null);
}

// ---------- F：一句话结论 ----------
export function getOneLineSummary(systemId: SystemId): string {
  const map = F as Record<string, string>;
  return map[systemId] ?? "";
}

// ---------- A：系统机制 narrative ----------
export function getNarrative(systemId: SystemId): string {
  const map = A as Record<string, string>;
  return map[systemId] ?? "";
}

// ---------- B：位点 annotation ----------
export interface GenAnnotation {
  annotation: string;
  effectDirection?: string;
  userImplication?: string;
}
export function getAnnotation(rsid: string): GenAnnotation | undefined {
  const map = B as Record<string, GenAnnotation>;
  return map[rsid];
}

// ---------- C：补剂矩阵 ----------
interface RawRationale {
  rsid?: string;
  geneSymbol?: string;
  mechanism?: string;
}
interface RawRec {
  title: string;
  tier: Tier;
  type?: string;
  dose?: string;
  rationale?: RawRationale[];
  appliesToSystems?: string[];
}
interface RawCSupp {
  recommendations?: RawRec[];
  avoid?: RawRec[];
}

export function getSupplementMatrix(): { recommendations: Recommendation[]; avoid: Recommendation[] } {
  const raw = C as RawCSupp;
  const toRec = (r: RawRec, idx: number, kind: "supplement" | "avoid"): Recommendation => ({
    id: `${kind}_${idx}`,
    type: kind === "supplement" ? "supplement" : "avoid",
    tier: (["S", "A", "B"].includes(r.tier) ? r.tier : "B") as Tier,
    title: r.title,
    dose: r.dose,
    rationale: (r.rationale ?? []).map((x) => ({
      rsid: x.rsid,
      geneSymbol: x.geneSymbol,
      mechanism: x.mechanism ?? "",
    })),
    appliesToSystems: normalizeSystems(r.appliesToSystems),
  });
  return {
    recommendations: (raw.recommendations ?? []).map((r, i) => toRec(r, i, "supplement")),
    avoid: (raw.avoid ?? []).map((r, i) => toRec(r, i, "avoid")),
  };
}

// ---------- D：监测矩阵 ----------
interface RawMetric {
  metric: string;
  target?: string;
  frequency?: string;
  rationale?: string;
}

/**
 * 把生成的 "Hcy (同型半胱氨酸)" 简化为前端用的短名，方便和体检 metric 匹配。
 */
function shortMetric(m: string): string {
  // 取首个空格 / 括号前的片段
  return m.split(/\s*[（(]/)[0].trim();
}

export function getMonitoringMatrix(): MonitoringMetric[] {
  const arr = D as RawMetric[];
  return arr.map((m) => ({
    metric: shortMetric(m.metric ?? ""),
    target: m.target ?? "",
    frequency: m.frequency ?? "",
    rationale: m.rationale ?? "",
    status: "unknown",
  }));
}

// ---------- E：交叉影响 ----------
interface RawCrossLink {
  systemId: string;
  relation?: "synergy" | "antagonism";
  mechanism?: string;
}
export interface GenCrossLink {
  systemId: SystemId;
  relation: "synergy" | "antagonism";
  mechanism: string;
}
export function getCrossLinks(systemId: SystemId): GenCrossLink[] {
  const map = E as Record<string, RawCrossLink[]>;
  const list = map[systemId] ?? [];
  return list
    .map((c) => {
      const sid = normalizeSystem(c.systemId);
      if (!sid || sid === systemId) return null;
      return {
        systemId: sid,
        relation: c.relation === "antagonism" ? "antagonism" : "synergy",
        mechanism: c.mechanism ?? "",
      };
    })
    .filter((x): x is GenCrossLink => x !== null);
}

// ---------- H：未覆盖位点 ----------
interface RawUncovered {
  rsid: string;
  geneSymbol?: string;
  priority?: Tier;
  whyImportant?: string;
  whyImportantForUser?: string;
  suggestedAction?: string;
}
export interface GenUncovered {
  rsid: string;
  geneSymbol: string;
  priority: Tier;
  reason: string;
  suggestedAction: string;
}
export function getUncoveredRsids(): GenUncovered[] {
  const arr = H as RawUncovered[];
  return arr.map((u) => ({
    rsid: u.rsid,
    geneSymbol: u.geneSymbol ?? "",
    priority: (["S", "A", "B"].includes(u.priority as string) ? (u.priority as Tier) : "B") as Tier,
    reason: u.whyImportantForUser ?? u.whyImportant ?? "",
    suggestedAction: u.suggestedAction ?? "",
  }));
}

// ---------- I：补剂冲突规则 ----------
interface RawConflict {
  trigger: string;
  severity?: "high" | "medium" | "low";
  title: string;
  reason: string;
  suggestion?: string;
}
export type GenConflict = Required<Omit<RawConflict, "severity">> & { severity: "high" | "medium" | "low" };
export function getConflictRules(): GenConflict[] {
  const arr = I as RawConflict[];
  return arr.map((c) => ({
    trigger: c.trigger ?? "",
    severity: c.severity ?? "medium",
    title: c.title ?? "",
    reason: c.reason ?? "",
    suggestion: c.suggestion ?? "",
  }));
}
