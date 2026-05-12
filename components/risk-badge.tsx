import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types";

const LABEL: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
  unknown: "未知",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={level}>{LABEL[level]}</Badge>;
}

export function riskColor(level: RiskLevel): string {
  return level === "high"
    ? "#DC2626"
    : level === "medium"
      ? "#EA580C"
      : level === "low"
        ? "#16A34A"
        : "#94A3B8";
}
