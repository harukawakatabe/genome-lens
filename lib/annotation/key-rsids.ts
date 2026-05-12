import type { SystemId } from "@/types";
import { getAnnotation } from "@/lib/generated-loader";

export interface KeyRsidEntry {
  rsid: string;
  geneSymbol: string;
  variantName?: string;
  system: SystemId;
  // 风险等位（按 + 链或参考链报告，可能与 23andMe 输出方向不一致，本占位仅用于 demo）
  riskAllele?: string;
  refAllele?: string;
  annotation: string;
}

/** 优先返回 LLM 生成的真实 annotation，缺失时回退到静态短描述。 */
function gen(rsid: string, fallback: string): string {
  return getAnnotation(rsid)?.annotation ?? fallback;
}

/**
 * 关键 SNP 占位字典，结构完整，可后续从外部 JSON 加载替换。
 * 真实生产应来源于权威数据库（ClinVar / dbSNP / PharmGKB / SNPedia）。
 */
export const KEY_RSIDS: KeyRsidEntry[] = [
  // 神经
  { rsid: "rs429358", geneSymbol: "APOE", variantName: "APOE C112R", system: "neuro", riskAllele: "C", refAllele: "T", annotation: gen("rs429358", "APOE ε4 标记位点之一，C 为风险等位。") },
  { rsid: "rs7412", geneSymbol: "APOE", variantName: "APOE R158C", system: "neuro", riskAllele: "T", refAllele: "C", annotation: gen("rs7412", "APOE ε2 标记位点之一，T 为保护等位。") },
  { rsid: "rs6265", geneSymbol: "BDNF", variantName: "Val66Met", system: "neuro", riskAllele: "T", refAllele: "C", annotation: gen("rs6265", "Met 等位与突触可塑性下降相关。") },
  // 炎症免疫
  { rsid: "rs1800795", geneSymbol: "IL6", variantName: "IL-6 -174G/C", system: "inflammation", riskAllele: "G", refAllele: "C", annotation: gen("rs1800795", "GG 与 IL-6 高产相关。") },
  { rsid: "rs1800629", geneSymbol: "TNF", variantName: "TNF -308G/A", system: "inflammation", riskAllele: "A", refAllele: "G", annotation: gen("rs1800629", "A 等位与 TNF-α 高表达相关。") },
  // 甲基化
  { rsid: "rs1801133", geneSymbol: "MTHFR", variantName: "C677T", system: "methylation", riskAllele: "T", refAllele: "C", annotation: gen("rs1801133", "T 等位使酶活性下降，影响 5-MTHF 生成。") },
  { rsid: "rs1801131", geneSymbol: "MTHFR", variantName: "A1298C", system: "methylation", riskAllele: "G", refAllele: "T", annotation: gen("rs1801131", "另一 MTHFR 常见变异，与 BH4 通路相关。") },
  { rsid: "rs1801394", geneSymbol: "MTRR", variantName: "A66G", system: "methylation", riskAllele: "G", refAllele: "A", annotation: gen("rs1801394", "影响 B12 再活化与 MTR 再生。") },
  { rsid: "rs1805087", geneSymbol: "MTR", variantName: "A2756G", system: "methylation", riskAllele: "G", refAllele: "A", annotation: gen("rs1805087", "蛋氨酸合成酶变异。") },
  // 维生素
  { rsid: "rs2228570", geneSymbol: "VDR", variantName: "FokI", system: "vitamin", riskAllele: "T", refAllele: "C", annotation: gen("rs2228570", "VDR FokI 影响维 D 受体活性。") },
  { rsid: "rs7501331", geneSymbol: "BCO1", variantName: "BCO1 R267S", system: "vitamin", riskAllele: "T", refAllele: "C", annotation: gen("rs7501331", "β-胡萝卜素转化为视黄醇能力下降。") },
  { rsid: "rs12934922", geneSymbol: "BCO1", variantName: "BCO1 A379V", system: "vitamin", riskAllele: "T", refAllele: "A", annotation: gen("rs12934922", "BCO1 第二常见低活性变异。") },
  { rsid: "rs1801198", geneSymbol: "TCN2", variantName: "TCN2 P259R", system: "vitamin", riskAllele: "G", refAllele: "C", annotation: gen("rs1801198", "B12 运输蛋白活性下降。") },
  // 雌激素
  { rsid: "rs4646903", geneSymbol: "CYP1A1", variantName: "MspI", system: "estrogen", riskAllele: "C", refAllele: "T", annotation: gen("rs4646903", "CYP1A1 诱导型变异，影响 2-OH 通路。") },
  { rsid: "rs1056836", geneSymbol: "CYP1B1", variantName: "L432V", system: "estrogen", riskAllele: "G", refAllele: "C", annotation: gen("rs1056836", "4-OH 通路活性增加，4-OH-E2 蓄积。") },
  // 解毒
  { rsid: "rs1695", geneSymbol: "GSTP1", variantName: "I105V", system: "detox", riskAllele: "G", refAllele: "A", annotation: gen("rs1695", "GST π 同工酶活性变化。") },
  // 神经递质
  { rsid: "rs4680", geneSymbol: "COMT", variantName: "Val158Met", system: "neurotransmitter", riskAllele: "A", refAllele: "G", annotation: gen("rs4680", "GG=Val/Val 高活性；AA=Met/Met 低活性。") },
  { rsid: "rs6323", geneSymbol: "MAOA", variantName: "MAOA R297R", system: "neurotransmitter", riskAllele: "T", refAllele: "G", annotation: gen("rs6323", "MAOA 活性变异，G=高活性。") },
  // 心代谢
  { rsid: "rs8192678", geneSymbol: "PPARGC1A", variantName: "Gly482Ser", system: "cardio", riskAllele: "A", refAllele: "G", annotation: gen("rs8192678", "Ser 等位与线粒体生物合成下降相关。") },
  { rsid: "rs7903146", geneSymbol: "TCF7L2", variantName: "TCF7L2 IVS", system: "cardio", riskAllele: "T", refAllele: "C", annotation: gen("rs7903146", "T 等位增加 2 型糖尿病风险。") },
];

export const KEY_RSID_SET = new Set(KEY_RSIDS.map((k) => k.rsid));

export function findEntry(rsid: string): KeyRsidEntry | undefined {
  return KEY_RSIDS.find((e) => e.rsid === rsid);
}

export function classifyEffect(
  entry: KeyRsidEntry,
  genotype: string,
): "wild" | "hetero" | "homo" | "unknown" {
  if (!entry.riskAllele || !genotype || genotype.includes("-")) return "unknown";
  const alleles = genotype.replace(/[^ACGT]/gi, "").toUpperCase().split("");
  if (alleles.length < 2) return "unknown";
  const risk = entry.riskAllele.toUpperCase();
  const n = alleles.filter((a) => a === risk).length;
  if (n === 0) return "wild";
  if (n === 1) return "hetero";
  return "homo";
}
