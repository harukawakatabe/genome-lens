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
      uncoveredImportantRsids: [
        { rsid: "rs1801272", reason: "NAT2 慢乙酰化分型，影响某些药物代谢，本次芯片未覆盖。" },
        { rsid: "rs1799853", reason: "CYP2C9*2，与华法林剂量相关。" },
      ],
    },
  };
}

function buildNeuro(genes: GenotypedGene[], basic: BasicInfo): SystemAssessment {
  const apoe = basic.apoe ?? "未知";
  const isE4 = apoe.includes("ε4");
  const bdnf = geneByRs(genes, "rs6265");
  const driving: { rsid: string; reason: string }[] = [];
  if (isE4) driving.push({ rsid: "rs429358", reason: `APOE 分型 ${apoe}，ε4 携带提示晚发型 AD 与神经炎症风险升高。` });
  if (bdnf && bdnf.effectType !== "wild") driving.push({ rsid: "rs6265", reason: "BDNF Val/Met 杂合，突触可塑性下降。" });
  return {
    systemId: "neuro",
    title: "神经与脑",
    riskLevel: isE4 ? "high" : "medium",
    oneLineSummary: isE4
      ? "APOE ε4 携带 + BDNF Val/Met，神经退行与可塑性双通路风险偏高。"
      : "神经系统总体倾向中等，建议长期保持有氧运动与 Ω-3 摄入。",
    drivingVariants: driving,
    crossSystemLinks: [
      { systemId: "inflammation", mechanism: "ε4 + IL-6 高产共同放大神经炎症。", relation: "synergy" },
      { systemId: "cardio", mechanism: "APOE ε4 + 胰岛素抵抗显著增加痴呆风险。", relation: "synergy" },
    ],
    narrative:
      "APOE ε4 等位降低 Aβ 清除效率，与年龄相关认知下降相关；建议关注血糖、血压、睡眠与有氧运动等可干预因子。",
  };
}

function buildInflammation(genes: GenotypedGene[], hla: HlaRecord[]): SystemAssessment {
  const il6 = geneByRs(genes, "rs1800795");
  const b27 = hla.some((h) => h.locus === "B" && (h.allele1.startsWith("B*27") || h.allele2.startsWith("B*27")));
  const drb1_15 = hla.some((h) => h.locus === "DRB1" && (h.allele1.startsWith("DRB1*15") || h.allele2.startsWith("DRB1*15")));
  const risk = (il6?.effectType === "homo" && (b27 || drb1_15) ? "high" : il6?.effectType !== "wild" ? "medium" : "low") as
    | "high"
    | "medium"
    | "low";
  return {
    systemId: "inflammation",
    title: "炎症与免疫",
    riskLevel: risk,
    oneLineSummary: "IL-6 GG 高产型 + HLA-B*27:05 / DRB1*15:01 背景，建议主动管理慢性炎症与自身免疫风险。",
    drivingVariants: [
      ...(il6 ? [{ rsid: "rs1800795", reason: "IL-6 -174 GG 与高 IL-6 产出相关。" }] : []),
    ],
    crossSystemLinks: [
      { systemId: "neuro", mechanism: "高 IL-6 加速 APOE ε4 介导的神经炎症。", relation: "synergy" },
      { systemId: "estrogen", mechanism: "炎症通路与 4-OH 雌激素互相放大。", relation: "synergy" },
    ],
    narrative:
      "HLA-B*27:05 与脊柱关节病相关，DRB1*15:01 与多发性硬化相关，结合 IL-6 高产倾向，建议监测 hsCRP / IL-6 / 抗核抗体。",
  };
}

function buildMethylation(genes: GenotypedGene[]): SystemAssessment {
  const c677t = geneByRs(genes, "rs1801133");
  const a1298c = geneByRs(genes, "rs1801131");
  const score = effectScore(c677t) + effectScore(a1298c);
  return {
    systemId: "methylation",
    title: "甲基化系统",
    riskLevel: score >= 3 ? "high" : score >= 2 ? "medium" : "low",
    oneLineSummary: "MTHFR C677T 杂合 + A1298C 纯合（复合杂合），5-MTHF 生成显著受限。",
    drivingVariants: [
      ...(c677t ? [{ rsid: "rs1801133", reason: "C677T 杂合，酶活性下降约 30%。" }] : []),
      ...(a1298c ? [{ rsid: "rs1801131", reason: "A1298C 纯合，进一步压低活性。" }] : []),
    ],
    crossSystemLinks: [
      { systemId: "neuro", mechanism: "甲基化不足影响神经递质合成与髓鞘维护。", relation: "synergy" },
      { systemId: "estrogen", mechanism: "甲基化能力影响 COMT 介导的 2-OH/4-OH 灭活。", relation: "synergy" },
    ],
    narrative:
      "建议优先使用活性形式（5-MTHF / 甲钴胺 / P-5-P），并定期监测同型半胱氨酸（目标 < 8 μmol/L）。",
  };
}

function buildVitamin(genes: GenotypedGene[]): SystemAssessment {
  const bco1a = geneByRs(genes, "rs7501331");
  const bco1b = geneByRs(genes, "rs12934922");
  const tcn2 = geneByRs(genes, "rs1801198");
  const vdr = geneByRs(genes, "rs2228570");
  return {
    systemId: "vitamin",
    title: "维生素代谢",
    riskLevel: "high",
    oneLineSummary: "BCO1 双纯合 + TCN2 GG + VDR FokI 杂合，β-胡萝卜素、B12、维 D 三条通路同时受限。",
    drivingVariants: [
      ...(bco1a ? [{ rsid: "rs7501331", reason: "BCO1 R267S 纯合。" }] : []),
      ...(bco1b ? [{ rsid: "rs12934922", reason: "BCO1 A379V 纯合。" }] : []),
      ...(tcn2 ? [{ rsid: "rs1801198", reason: "TCN2 P259R 纯合。" }] : []),
      ...(vdr ? [{ rsid: "rs2228570", reason: "VDR FokI 杂合。" }] : []),
    ],
    crossSystemLinks: [
      { systemId: "methylation", mechanism: "B12 运输受限直接影响 MTR 反应。", relation: "synergy" },
      { systemId: "inflammation", mechanism: "维 D 不足放大慢性炎症。", relation: "synergy" },
    ],
    narrative:
      "建议直接补充视黄醇形式的维 A，使用甲钴胺 + 腺苷钴胺，监测 25-OH-D 目标 50-60 ng/mL，holoTC > 50 pmol/L。",
  };
}

function buildEstrogen(genes: GenotypedGene[]): SystemAssessment {
  const cyp1b1 = geneByRs(genes, "rs1056836");
  return {
    systemId: "estrogen",
    title: "雌激素代谢",
    riskLevel: cyp1b1 && cyp1b1.effectType !== "wild" ? "medium" : "low",
    oneLineSummary: "CYP1B1 杂合，4-OH 通路活性偏高，建议加强 2-OH 通路与谷胱甘肽支持。",
    drivingVariants: cyp1b1 ? [{ rsid: "rs1056836", reason: "CYP1B1 L432V 杂合。" }] : [],
    crossSystemLinks: [
      { systemId: "detox", mechanism: "雌激素 II 相解毒依赖 GST/SULT 通路。", relation: "synergy" },
    ],
    narrative: "建议十字花科蔬菜（DIM/I3C）+ 充足镁/B6/B12 支持甲基化灭活。",
  };
}

function buildDetox(genes: GenotypedGene[]): SystemAssessment {
  const gstp1 = geneByRs(genes, "rs1695");
  return {
    systemId: "detox",
    title: "氧化与解毒",
    riskLevel: gstp1 && gstp1.effectType !== "wild" ? "medium" : "low",
    oneLineSummary: "GSTP1 杂合，二相解毒能力中等，建议环境暴露最小化。",
    drivingVariants: gstp1 ? [{ rsid: "rs1695", reason: "GSTP1 I105V 杂合。" }] : [],
    crossSystemLinks: [
      { systemId: "estrogen", mechanism: "4-OH 雌激素通过 GST 灭活。", relation: "synergy" },
    ],
    narrative: "建议补充 NAC / 谷胱甘肽前体，避免长期接触染发剂、农药残留。",
  };
}

function buildNeurotransmitter(genes: GenotypedGene[]): SystemAssessment {
  const comt = geneByRs(genes, "rs4680");
  const maoa = geneByRs(genes, "rs6323");
  return {
    systemId: "neurotransmitter",
    title: "神经递质",
    riskLevel: "medium",
    oneLineSummary: "COMT Val/Val + MAOA 高活性，多巴胺周转快，压力下易疲劳。",
    drivingVariants: [
      ...(comt ? [{ rsid: "rs4680", reason: "COMT Val/Val 高速型。" }] : []),
      ...(maoa ? [{ rsid: "rs6323", reason: "MAOA 高活性。" }] : []),
    ],
    crossSystemLinks: [
      { systemId: "estrogen", mechanism: "COMT 同时负责儿茶酚胺与儿茶酚雌激素灭活。", relation: "synergy" },
    ],
    narrative: "高速型在高强度脑力工作下需注意酪氨酸 / 苯丙氨酸摄入与睡眠质量。",
  };
}

function buildCardio(genes: GenotypedGene[]): SystemAssessment {
  const pgc1a = geneByRs(genes, "rs8192678");
  return {
    systemId: "cardio",
    title: "心血管与代谢",
    riskLevel: pgc1a?.effectType === "homo" ? "medium" : "low",
    oneLineSummary: "PPARGC1A Ser/Ser，线粒体生物合成偏低，需以耐力训练弥补。",
    drivingVariants: pgc1a ? [{ rsid: "rs8192678", reason: "PPARGC1A Ser/Ser。" }] : [],
    crossSystemLinks: [
      { systemId: "neuro", mechanism: "胰岛素抵抗 + APOE ε4 放大痴呆风险。", relation: "synergy" },
    ],
    narrative: "建议每周 ≥150 min 中等强度有氧 + 抗阻训练，监测胰岛素与空腹血糖。",
  };
}

function buildRecommendations(genes: GenotypedGene[]): Recommendation[] {
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

function buildAvoidList(genes: GenotypedGene[]): Recommendation[] {
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

function buildMonitoring(_genes: GenotypedGene[], labs: LabResult[]): MonitoringMetric[] {
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
