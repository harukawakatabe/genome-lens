export type SystemId =
  | "neuro"
  | "inflammation"
  | "methylation"
  | "vitamin"
  | "estrogen"
  | "detox"
  | "neurotransmitter"
  | "cardio";

export type RiskLevel = "high" | "medium" | "low" | "unknown";
export type Tier = "S" | "A" | "B";

export interface BasicInfo {
  sex: "female" | "male";
  birthYear: number;
  region: string;
  apoe?: string;
}

export interface GenotypedGene {
  rsid: string;
  geneSymbol: string;
  variantName?: string;
  genotype: string;
  effectType: "wild" | "hetero" | "homo" | "unknown";
  system: SystemId;
  annotation: string;
}

export interface HlaRecord {
  locus: "A" | "B" | "C" | "DRB1" | "DQB1";
  allele1: string;
  allele2: string;
}

export interface SupplementItem {
  id: string;
  brand: string;
  name: string;
  ingredients: {
    name: string;
    amount: number;
    unit: "mg" | "mcg" | "g" | "IU";
  }[];
  dailyDose?: string;
}

export interface LabResult {
  id: string;
  metric: string;
  value: number;
  unit: string;
  measuredAt: string;
  reference?: {
    low?: number;
    high?: number;
    targetLow?: number;
    targetHigh?: number;
  };
}

export interface SystemAssessment {
  systemId: SystemId;
  title: string;
  riskLevel: RiskLevel;
  oneLineSummary: string;
  drivingVariants: { rsid: string; reason: string }[];
  crossSystemLinks: {
    systemId: SystemId;
    mechanism: string;
    relation: "synergy" | "antagonism";
  }[];
  narrative: string; // Markdown
}

export interface Recommendation {
  id: string;
  type: "supplement" | "monitor" | "avoid" | "behavior";
  tier: Tier;
  title: string;
  dose?: string;
  rationale: { rsid?: string; geneSymbol?: string; mechanism: string }[];
  appliesToSystems: SystemId[];
}

export interface MonitoringMetric {
  metric: string;
  target: string;
  frequency: string;
  rationale: string;
  userValues?: LabResult[];
  status?: "in_range" | "borderline" | "out_of_range" | "unknown";
}

export interface GenomeReport {
  generatedAt: string;
  basic: BasicInfo;
  genes: GenotypedGene[];
  hla: HlaRecord[];
  supplements: SupplementItem[];
  labs: LabResult[];
  systems: SystemAssessment[];
  recommendations: Recommendation[];
  avoidList: Recommendation[];
  monitoring: MonitoringMetric[];
  appendix: {
    uncoveredImportantRsids: { rsid: string; reason: string }[];
  };
}

export type ChatTopic =
  | "mechanism"
  | "dose"
  | "alternatives"
  | "monitoring"
  | "risk";

export interface ChatContext {
  systemId?: SystemId;
  geneSymbol?: string;
  rsid?: string;
  topic?: ChatTopic;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context: ChatContext;
}

export interface SystemMeta {
  id: SystemId;
  title: string;
  shortTitle: string;
  icon: string; // lucide icon name
  description: string;
}

export const SYSTEMS: SystemMeta[] = [
  {
    id: "neuro",
    title: "神经与脑",
    shortTitle: "神经",
    icon: "Brain",
    description: "APOE、BDNF 等位点决定的神经退行与突触可塑性",
  },
  {
    id: "inflammation",
    title: "炎症与免疫",
    shortTitle: "炎症免疫",
    icon: "Shield",
    description: "IL-6、TNF 与 HLA 背景下的免疫倾向",
  },
  {
    id: "methylation",
    title: "甲基化系统",
    shortTitle: "甲基化",
    icon: "GitBranch",
    description: "MTHFR、MTR、MTRR 等通路驱动的一碳代谢",
  },
  {
    id: "vitamin",
    title: "维生素代谢",
    shortTitle: "维生素",
    icon: "Pill",
    description: "VDR、BCO1、TCN2 影响下的维生素吸收转化",
  },
  {
    id: "estrogen",
    title: "雌激素代谢",
    shortTitle: "雌激素",
    icon: "Flower",
    description: "CYP1A1/CYP1B1/COMT 决定的雌激素通路",
  },
  {
    id: "detox",
    title: "氧化与解毒",
    shortTitle: "解毒",
    icon: "Filter",
    description: "GST/SULT/NAT 等二相解毒能力",
  },
  {
    id: "neurotransmitter",
    title: "神经递质",
    shortTitle: "神经递质",
    icon: "Activity",
    description: "COMT/MAOA 决定的多巴胺/儿茶酚胺周转",
  },
  {
    id: "cardio",
    title: "心血管与代谢",
    shortTitle: "心代谢",
    icon: "Heart",
    description: "PPARGC1A/APOE/TCF7L2 的代谢与心血管倾向",
  },
];
