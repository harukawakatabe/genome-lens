import type { GenotypedGene, HlaRecord, SupplementItem, LabResult, BasicInfo } from "@/types";

/**
 * 占位用户：女性 / APOE ε3/ε4 / MTHFR C677T 杂合 + A1298C 纯合 / COMT GG /
 * MAOA GG / TCN2 GG / BCO1 双纯合 / IL-6 GG / VDR FokI 杂合 / BDNF Val/Met /
 * PPARGC1A Ser/Ser / HLA-B*27:05 + DRB1*15:01 + DRB1*04:03
 */
export const MOCK_BASIC: BasicInfo = {
  sex: "female",
  birthYear: 1992,
  region: "中国大陆",
  apoe: "ε3/ε4",
};

export const MOCK_GENES: GenotypedGene[] = [
  { rsid: "rs429358", geneSymbol: "APOE", variantName: "APOE C112R", genotype: "CT", effectType: "hetero", system: "neuro", annotation: "APOE ε4 标记，杂合携带。" },
  { rsid: "rs7412", geneSymbol: "APOE", variantName: "APOE R158C", genotype: "CC", effectType: "wild", system: "neuro", annotation: "非 ε2 携带。" },
  { rsid: "rs6265", geneSymbol: "BDNF", variantName: "Val66Met", genotype: "CT", effectType: "hetero", system: "neuro", annotation: "Val/Met 杂合，突触可塑性轻度受影响。" },
  { rsid: "rs1800795", geneSymbol: "IL6", variantName: "IL-6 -174G/C", genotype: "GG", effectType: "homo", system: "inflammation", annotation: "高产型，慢性炎症倾向。" },
  { rsid: "rs1800629", geneSymbol: "TNF", variantName: "TNF -308G/A", genotype: "GG", effectType: "wild", system: "inflammation", annotation: "TNF-α 正常表达。" },
  { rsid: "rs1801133", geneSymbol: "MTHFR", variantName: "C677T", genotype: "CT", effectType: "hetero", system: "methylation", annotation: "C677T 杂合，酶活性约下降 30%。" },
  { rsid: "rs1801131", geneSymbol: "MTHFR", variantName: "A1298C", genotype: "GG", effectType: "homo", system: "methylation", annotation: "A1298C 纯合，与 C677T 复合杂合显著影响一碳代谢。" },
  { rsid: "rs1801394", geneSymbol: "MTRR", variantName: "A66G", genotype: "AG", effectType: "hetero", system: "methylation", annotation: "MTRR 杂合，B12 再活化轻度受影响。" },
  { rsid: "rs1805087", geneSymbol: "MTR", variantName: "A2756G", genotype: "AA", effectType: "wild", system: "methylation", annotation: "野生型。" },
  { rsid: "rs2228570", geneSymbol: "VDR", variantName: "FokI", genotype: "CT", effectType: "hetero", system: "vitamin", annotation: "FokI 杂合，VDR 活性中等。" },
  { rsid: "rs7501331", geneSymbol: "BCO1", variantName: "BCO1 R267S", genotype: "TT", effectType: "homo", system: "vitamin", annotation: "β-胡萝卜素转化能力显著下降。" },
  { rsid: "rs12934922", geneSymbol: "BCO1", variantName: "BCO1 A379V", genotype: "TT", effectType: "homo", system: "vitamin", annotation: "BCO1 双纯合，建议直接补充视黄醇。" },
  { rsid: "rs1801198", geneSymbol: "TCN2", variantName: "TCN2 P259R", genotype: "GG", effectType: "homo", system: "vitamin", annotation: "B12 运输蛋白活性受损，建议监测 holoTC/MMA。" },
  { rsid: "rs4646903", geneSymbol: "CYP1A1", variantName: "MspI", genotype: "TT", effectType: "wild", system: "estrogen", annotation: "野生型。" },
  { rsid: "rs1056836", geneSymbol: "CYP1B1", variantName: "L432V", genotype: "CG", effectType: "hetero", system: "estrogen", annotation: "杂合，4-OH 通路活性中等偏高。" },
  { rsid: "rs1695", geneSymbol: "GSTP1", variantName: "I105V", genotype: "AG", effectType: "hetero", system: "detox", annotation: "杂合，二相解毒能力中等。" },
  { rsid: "rs4680", geneSymbol: "COMT", variantName: "Val158Met", genotype: "GG", effectType: "wild", system: "neurotransmitter", annotation: "Val/Val 高速型，多巴胺周转快。" },
  { rsid: "rs6323", geneSymbol: "MAOA", variantName: "MAOA R297R", genotype: "GG", effectType: "wild", system: "neurotransmitter", annotation: "MAOA 高活性，单胺类降解快。" },
  { rsid: "rs8192678", geneSymbol: "PPARGC1A", variantName: "Gly482Ser", genotype: "AA", effectType: "homo", system: "cardio", annotation: "Ser/Ser，线粒体生物合成下降。" },
  { rsid: "rs7903146", geneSymbol: "TCF7L2", variantName: "TCF7L2 IVS", genotype: "CC", effectType: "wild", system: "cardio", annotation: "野生型。" },
];

export const MOCK_HLA: HlaRecord[] = [
  { locus: "A", allele1: "A*11:01", allele2: "A*02:01" },
  { locus: "B", allele1: "B*27:05", allele2: "B*46:01" },
  { locus: "C", allele1: "C*01:02", allele2: "C*07:02" },
  { locus: "DRB1", allele1: "DRB1*15:01", allele2: "DRB1*04:03" },
  { locus: "DQB1", allele1: "DQB1*06:02", allele2: "DQB1*03:02" },
];

export const MOCK_SUPPLEMENTS: SupplementItem[] = [
  {
    id: "s1",
    brand: "Thorne",
    name: "Basic Nutrients 2/Day",
    ingredients: [
      { name: "5-MTHF", amount: 1000, unit: "mcg" },
      { name: "甲钴胺", amount: 500, unit: "mcg" },
      { name: "维生素 D3", amount: 1000, unit: "IU" },
    ],
    dailyDose: "每日 1 粒",
  },
  {
    id: "s2",
    brand: "Now Foods",
    name: "Omega-3 1000mg",
    ingredients: [
      { name: "EPA", amount: 360, unit: "mg" },
      { name: "DHA", amount: 240, unit: "mg" },
    ],
    dailyDose: "每日 2 粒",
  },
  {
    id: "s3",
    brand: "Pure Encapsulations",
    name: "Magnesium Glycinate",
    ingredients: [{ name: "甘氨酸镁", amount: 200, unit: "mg" }],
    dailyDose: "睡前 1 粒",
  },
];

export const MOCK_LABS: LabResult[] = [
  { id: "l1", metric: "Hcy", value: 11.2, unit: "μmol/L", measuredAt: "2026-03-12", reference: { targetLow: 5, targetHigh: 8 } },
  { id: "l2", metric: "25-OH-D", value: 24, unit: "ng/mL", measuredAt: "2026-03-12", reference: { targetLow: 40, targetHigh: 60 } },
  { id: "l3", metric: "hsCRP", value: 2.1, unit: "mg/L", measuredAt: "2026-03-12", reference: { targetLow: 0, targetHigh: 1 } },
  { id: "l4", metric: "铁蛋白", value: 38, unit: "ng/mL", measuredAt: "2026-03-12", reference: { targetLow: 50, targetHigh: 150 } },
  { id: "l5", metric: "TSH", value: 2.3, unit: "mIU/L", measuredAt: "2026-03-12", reference: { targetLow: 0.5, targetHigh: 2.5 } },
];
