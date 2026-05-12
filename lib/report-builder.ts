import type {
  BasicInfo,
  GenomeReport,
  GenotypedGene,
  HlaRecord,
  LabResult,
  MonitoringMetric,
  Recommendation,
  SupplementItem,
  SystemAssessment,
  SystemId,
} from "@/types";
import { uid } from "@/lib/utils";
import {
  getOneLineSummary,
  getNarrative,
  getCrossLinks,
  getSupplementMatrix,
  getMonitoringMatrix,
  getUncoveredRsids,
} from "@/lib/generated-loader";

/**
 * 静态规则占位：依据用户分型生成系统评估、推荐与监测。
 * 真实版本应从 content/rules.json 加载并执行规则引擎。
 */

interface BuildInput {
  basic: BasicInfo;
  genes: GenotypedGene[];
  hla: HlaRecord[];
  supplements: SupplementItem[];
  labs: LabResult[];
}

function geneByRs(genes: GenotypedGene[], rsid: string) {
  return genes.find((g) => g.rsid === rsid);
}

function effectScore(g?: GenotypedGene): number {
  if (!g) return 0;
  if (g.effectType === "homo") return 2;
  if (g.effectType === "hetero") return 1;
  return 0;
}

export function buildReport(input: BuildInput): GenomeReport {
  const { basic, genes, hla, supplements, labs } = input;

  const systems: SystemAssessment[] = [
    buildNeuro(genes, basic),
    buildInflammation(genes, hla),
    buildMethylation(genes),
    buildVitamin(genes),
    buildEstrogen(genes),
    buildDetox(genes),
    buildNeurotransmitter(genes),
    buildCardio(genes),
  ];

  const recommendations = buildRecommendations(genes);
  const avoidList = buildAvoidList(genes);
  const monitoring = buildMonitoring(genes, labs);
  const uncovered = getUncoveredRsids();

  return {
    generatedAt: new Date().toISOString(),
    basic,
    genes,
    hla,
    supplements,
    labs,
    systems,
    recommendations,
    avoidList,
    monitoring,
    appendix: {
      uncoveredImportantRsids: uncovered.length
        ? uncovered.map((u) => ({
            rsid: u.rsid,
            reason: `[${u.priority}] ${u.geneSymbol}：${u.reason}${u.suggestedAction ? `（${u.suggestedAction}）` : ""}`,
          }))
        : [
            { rsid: "rs1801272", reason: "NAT2 慢乙酰化分型，影响某些药物代谢，本次芯片未覆盖。" },
            { rsid: "rs1799853", reason: "CYP2C9*2，与华法林剂量相关。" },
          ],
    },
  };
}

/**
 * 统一构造：以 LLM 生成的 F/A/E 为文本来源；
 * 风险等级与驱动位点仍由本地静态规则计算（保证与用户实际分型一致）。
 */
function assemble(
  systemId: SystemId,
  title: string,
  riskLevel: SystemAssessment["riskLevel"],
  drivingVariants: { rsid: string; reason: string }[],
  fallbackSummary: string,
  fallbackNarrative: string,
): SystemAssessment {
  return {
    systemId,
    title,
    riskLevel,
    oneLineSummary: getOneLineSummary(systemId) || fallbackSummary,
    drivingVariants,
    crossSystemLinks: getCrossLinks(systemId),
    narrative: getNarrative(systemId) || fallbackNarrative,
  };
}

function buildNeuro(genes: GenotypedGene[], basic: BasicInfo): SystemAssessment {
  const apoe = basic.apoe ?? "未知";
  const isE4 = apoe.includes("ε4");
  const bdnf = geneByRs(genes, "rs6265");
  const driving: { rsid: string; reason: string }[] = [];
  if (isE4) driving.push({ rsid: "rs429358", reason: `APOE 分型 ${apoe}，ε4 携带提示晚发型 AD 与神经炎症风险升高。` });
  if (bdnf && bdnf.effectType !== "wild") driving.push({ rsid: "rs6265", reason: "BDNF Val/Met 杂合，突触可塑性下降。" });
  return assemble(
    "neuro",
    "神经与脑",
    isE4 ? "high" : "medium",
    driving,
    isE4
      ? "APOE ε4 携带 + BDNF Val/Met，神经退行与可塑性双通路风险偏高。"
      : "神经系统总体倾向中等，建议长期保持有氧运动与 Ω-3 摄入。",
    "APOE ε4 等位降低 Aβ 清除效率，与年龄相关认知下降相关。",
  );
}

function buildInflammation(genes: GenotypedGene[], hla: HlaRecord[]): SystemAssessment {
  const il6 = geneByRs(genes, "rs1800795");
  const b27 = hla.some((h) => h.locus === "B" && (h.allele1.startsWith("B*27") || h.allele2.startsWith("B*27")));
  const drb1_15 = hla.some((h) => h.locus === "DRB1" && (h.allele1.startsWith("DRB1*15") || h.allele2.startsWith("DRB1*15")));
  const risk = (il6?.effectType === "homo" && (b27 || drb1_15) ? "high" : il6?.effectType !== "wild" ? "medium" : "low") as
    | "high"
    | "medium"
    | "low";
  return assemble(
    "inflammation",
    "炎症与免疫",
    risk,
    il6 ? [{ rsid: "rs1800795", reason: "IL-6 -174 GG 与高 IL-6 产出相关。" }] : [],
    "IL-6 GG 高产型 + HLA-B*27:05 / DRB1*15:01 背景。",
    "HLA-B*27:05 与脊柱关节病相关，DRB1*15:01 与多发性硬化相关。",
  );
}

function buildMethylation(genes: GenotypedGene[]): SystemAssessment {
  const c677t = geneByRs(genes, "rs1801133");
  const a1298c = geneByRs(genes, "rs1801131");
  const score = effectScore(c677t) + effectScore(a1298c);
  const driving = [
    ...(c677t ? [{ rsid: "rs1801133", reason: "C677T 杂合，酶活性下降约 30%。" }] : []),
    ...(a1298c ? [{ rsid: "rs1801131", reason: "A1298C 纯合，进一步压低活性。" }] : []),
  ];
  return assemble(
    "methylation",
    "甲基化系统",
    score >= 3 ? "high" : score >= 2 ? "medium" : "low",
    driving,
    "MTHFR C677T 杂合 + A1298C 纯合（复合杂合），5-MTHF 生成显著受限。",
    "建议优先使用活性形式（5-MTHF / 甲钴胺 / P-5-P）。",
  );
}

function buildVitamin(genes: GenotypedGene[]): SystemAssessment {
  const bco1a = geneByRs(genes, "rs7501331");
  const bco1b = geneByRs(genes, "rs12934922");
  const tcn2 = geneByRs(genes, "rs1801198");
  const vdr = geneByRs(genes, "rs2228570");
  return assemble(
    "vitamin",
    "维生素代谢",
    "high",
    [
      ...(bco1a ? [{ rsid: "rs7501331", reason: "BCO1 R267S 纯合。" }] : []),
      ...(bco1b ? [{ rsid: "rs12934922", reason: "BCO1 A379V 纯合。" }] : []),
      ...(tcn2 ? [{ rsid: "rs1801198", reason: "TCN2 P259R 纯合。" }] : []),
      ...(vdr ? [{ rsid: "rs2228570", reason: "VDR FokI 杂合。" }] : []),
    ],
    "BCO1 双纯合 + TCN2 GG + VDR FokI 杂合。",
    "建议直接补充视黄醇形式的维 A，使用甲钴胺 + 腺苷钴胺。",
  );
}

function buildEstrogen(genes: GenotypedGene[]): SystemAssessment {
  const cyp1b1 = geneByRs(genes, "rs1056836");
  return assemble(
    "estrogen",
    "雌激素代谢",
    cyp1b1 && cyp1b1.effectType !== "wild" ? "medium" : "low",
    cyp1b1 ? [{ rsid: "rs1056836", reason: "CYP1B1 L432V 杂合。" }] : [],
    "CYP1B1 杂合，4-OH 通路活性偏高。",
    "建议十字花科蔬菜（DIM/I3C）+ 充足镁/B6/B12 支持甲基化灭活。",
  );
}

function buildDetox(genes: GenotypedGene[]): SystemAssessment {
  const gstp1 = geneByRs(genes, "rs1695");
  return assemble(
    "detox",
    "氧化与解毒",
    gstp1 && gstp1.effectType !== "wild" ? "medium" : "low",
    gstp1 ? [{ rsid: "rs1695", reason: "GSTP1 I105V 杂合。" }] : [],
    "GSTP1 杂合，二相解毒能力中等。",
    "建议补充 NAC / 谷胱甘肽前体。",
  );
}

function buildNeurotransmitter(genes: GenotypedGene[]): SystemAssessment {
  const comt = geneByRs(genes, "rs4680");
  const maoa = geneByRs(genes, "rs6323");
  return assemble(
    "neurotransmitter",
    "神经递质",
    "medium",
    [
      ...(comt ? [{ rsid: "rs4680", reason: "COMT Val/Val 高速型。" }] : []),
      ...(maoa ? [{ rsid: "rs6323", reason: "MAOA 高活性。" }] : []),
    ],
    "COMT Val/Val + MAOA 高活性，多巴胺周转快。",
    "高速型在高强度脑力工作下需注意酪氨酸 / 苯丙氨酸摄入与睡眠质量。",
  );
}

function buildCardio(genes: GenotypedGene[]): SystemAssessment {
  const pgc1a = geneByRs(genes, "rs8192678");
  return assemble(
    "cardio",
    "心血管与代谢",
    pgc1a?.effectType === "homo" ? "medium" : "low",
    pgc1a ? [{ rsid: "rs8192678", reason: "PPARGC1A Ser/Ser。" }] : [],
    "PPARGC1A Ser/Ser，线粒体生物合成偏低。",
    "建议每周 ≥150 min 中等强度有氧 + 抗阻训练。",
  );
}

function buildRecommendations(_genes: GenotypedGene[]): Recommendation[] {
  const gen = getSupplementMatrix().recommendations;
  if (gen.length) return gen;
  return buildFallbackRecommendations();
}

function buildAvoidList(_genes: GenotypedGene[]): Recommendation[] {
  const gen = getSupplementMatrix().avoid;
  if (gen.length) return gen;
  return buildFallbackAvoidList();
}

function buildFallbackRecommendations(): Recommendation[] {
  const list: Recommendation[] = [];
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "S",
    title: "5-MTHF 活性叶酸",
    dose: "400-1000 mcg / 日",
    rationale: [
      { rsid: "rs1801133", geneSymbol: "MTHFR", mechanism: "C677T 杂合显著降低 5-MTHF 转化。" },
      { rsid: "rs1801131", geneSymbol: "MTHFR", mechanism: "A1298C 纯合加重负担。" },
    ],
    appliesToSystems: ["methylation", "neuro", "cardio"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "S",
    title: "甲钴胺 + 腺苷钴胺",
    dose: "500-1000 mcg / 日",
    rationale: [{ rsid: "rs1801198", geneSymbol: "TCN2", mechanism: "B12 运输蛋白活性受损。" }],
    appliesToSystems: ["methylation", "vitamin", "neuro"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "S",
    title: "视黄醇（预成形维 A）",
    dose: "1500-3000 IU / 日",
    rationale: [
      { rsid: "rs7501331", geneSymbol: "BCO1", mechanism: "β-胡萝卜素转化能力显著下降。" },
      { rsid: "rs12934922", geneSymbol: "BCO1", mechanism: "BCO1 第二位点同时纯合。" },
    ],
    appliesToSystems: ["vitamin"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "S",
    title: "维生素 D3 + K2",
    dose: "D3 2000-4000 IU / K2 100 mcg",
    rationale: [{ rsid: "rs2228570", geneSymbol: "VDR", mechanism: "VDR FokI 杂合，受体活性中等。" }],
    appliesToSystems: ["vitamin", "inflammation"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "A",
    title: "Ω-3（高 DHA）",
    dose: "EPA 500 + DHA 500 mg / 日",
    rationale: [
      { rsid: "rs429358", geneSymbol: "APOE", mechanism: "ε4 携带，建议规律 DHA 摄入支持神经膜。" },
      { rsid: "rs1800795", geneSymbol: "IL6", mechanism: "降低 IL-6 介导的慢性炎症。" },
    ],
    appliesToSystems: ["neuro", "inflammation", "cardio"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "A",
    title: "镁（甘氨酸镁 / 苹果酸镁）",
    dose: "200-400 mg / 日",
    rationale: [{ geneSymbol: "PPARGC1A", mechanism: "线粒体功能支持。" }],
    appliesToSystems: ["cardio", "neurotransmitter"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "B",
    title: "DIM / I3C",
    dose: "100-200 mg / 日",
    rationale: [{ rsid: "rs1056836", geneSymbol: "CYP1B1", mechanism: "促 2-OH 通路。" }],
    appliesToSystems: ["estrogen"],
  });
  list.push({
    id: uid("rec"),
    type: "supplement",
    tier: "B",
    title: "NAC（N-乙酰半胱氨酸）",
    dose: "600 mg / 日",
    rationale: [{ rsid: "rs1695", geneSymbol: "GSTP1", mechanism: "支持谷胱甘肽合成。" }],
    appliesToSystems: ["detox"],
  });
  return list;
}

function buildFallbackAvoidList(): Recommendation[] {
  return [
    {
      id: uid("avoid"),
      type: "avoid",
      tier: "S",
      title: "高剂量 α-生育酚单体",
      rationale: [{ rsid: "rs429358", geneSymbol: "APOE", mechanism: "ε4 携带下大剂量 α-生育酚可能不利，建议改用混合生育酚。" }],
      appliesToSystems: ["neuro"],
    },
    {
      id: uid("avoid"),
      type: "avoid",
      tier: "A",
      title: "叶酸（合成 folic acid）大剂量",
      rationale: [{ geneSymbol: "MTHFR", mechanism: "MTHFR 复合杂合下，未代谢叶酸（UMFA）可能堆积，宜直接使用 5-MTHF。" }],
      appliesToSystems: ["methylation"],
    },
    {
      id: uid("avoid"),
      type: "avoid",
      tier: "B",
      title: "高剂量纯 β-胡萝卜素",
      rationale: [{ geneSymbol: "BCO1", mechanism: "转化效率低，难以补足维 A 需求。" }],
      appliesToSystems: ["vitamin"],
    },
  ];
}

/**
 * 监测矩阵：优先取 generated（D），再叠加用户体检值与状态判定。
 * 匹配规则：generated metric 字段名经短化（如 "Hcy"），与体检 metric 直接相等。
 */
function buildMonitoring(_genes: GenotypedGene[], labs: LabResult[]): MonitoringMetric[] {
  const find = (m: string) => labs.filter((l) => l.metric === m);
  const gen = getMonitoringMatrix();
  if (gen.length) {
    return gen.map((m) => {
      const userValues = find(m.metric);
      const latest = userValues[0];
      return {
        ...m,
        userValues,
        status: deriveStatus(m.target, latest?.value),
      };
    });
  }
  return buildFallbackMonitoring(labs);
}

/** 从 target 字符串里粗略抽数值范围，给最近值打一个 in_range / borderline / out_of_range。 */
function deriveStatus(target: string, value?: number): MonitoringMetric["status"] {
  if (value === undefined || !Number.isFinite(value)) return "unknown";
  if (!target) return "unknown";
  // 「< X」单边
  const lt = target.match(/<\s*([\d.]+)/);
  if (lt) {
    const hi = Number(lt[1]);
    return value < hi ? "in_range" : value < hi * 1.2 ? "borderline" : "out_of_range";
  }
  // 「> X」单边
  const gt = target.match(/>\s*([\d.]+)/);
  if (gt) {
    const lo = Number(gt[1]);
    return value > lo ? "in_range" : value > lo * 0.8 ? "borderline" : "out_of_range";
  }
  // 「a-b」双边
  const range = target.match(/([\d.]+)\s*[-~–]\s*([\d.]+)/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (value >= lo && value <= hi) return "in_range";
    const margin = (hi - lo) * 0.15;
    if (value >= lo - margin && value <= hi + margin) return "borderline";
    return "out_of_range";
  }
  return "unknown";
}

function buildFallbackMonitoring(labs: LabResult[]): MonitoringMetric[] {
  const find = (m: string) => labs.filter((l) => l.metric === m);
  return [
    {
      metric: "Hcy",
      target: "< 8 μmol/L",
      frequency: "每 6 个月",
      rationale: "甲基化通路总体效率指标。",
      userValues: find("Hcy"),
      status: find("Hcy")[0]?.value && find("Hcy")[0]!.value > 8 ? "out_of_range" : "in_range",
    },
    {
      metric: "25-OH-D",
      target: "40-60 ng/mL",
      frequency: "每 6 个月",
      rationale: "VDR FokI 杂合，需较高血清水平。",
      userValues: find("25-OH-D"),
      status: (() => {
        const v = find("25-OH-D")[0]?.value;
        if (v === undefined) return "unknown";
        if (v < 40) return "out_of_range";
        if (v > 60) return "borderline";
        return "in_range";
      })(),
    },
    {
      metric: "hsCRP",
      target: "< 1 mg/L",
      frequency: "每 6 个月",
      rationale: "IL-6 高产倾向下的慢性炎症监测。",
      userValues: find("hsCRP"),
      status: (find("hsCRP")[0]?.value ?? 0) > 1 ? "out_of_range" : "in_range",
    },
    {
      metric: "铁蛋白",
      target: "50-150 ng/mL",
      frequency: "每 6 个月",
      rationale: "排查低铁与潜在炎症性升高。",
      userValues: find("铁蛋白"),
      status: (find("铁蛋白")[0]?.value ?? 0) < 50 ? "out_of_range" : "in_range",
    },
    {
      metric: "holoTC",
      target: "> 50 pmol/L",
      frequency: "每 12 个月",
      rationale: "TCN2 GG 下评估 B12 真实可用度。",
      userValues: find("holoTC"),
      status: "unknown",
    },
    {
      metric: "TSH",
      target: "0.5-2.5 mIU/L",
      frequency: "每 12 个月",
      rationale: "HLA 自身免疫背景下监测甲状腺。",
      userValues: find("TSH"),
      status: (find("TSH")[0]?.value ?? 0) > 2.5 ? "borderline" : "in_range",
    },
  ];
}
