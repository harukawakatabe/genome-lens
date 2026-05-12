import type { GenomeReport } from "@/types";
import { SYSTEMS } from "@/types";

export function exportReportMarkdown(report: GenomeReport): string {
  const lines: string[] = [];
  lines.push(`# Genome Lens · 遗传健康全景报告`);
  lines.push(`\n> 生成时间：${new Date(report.generatedAt).toLocaleString("zh-CN")}`);
  lines.push(`\n> **免责声明：本工具仅用于教育与自我管理参考，不构成医疗诊断，请在医生指导下使用。**\n`);

  lines.push(`## 一、基础信息`);
  lines.push(`- 性别：${report.basic.sex === "female" ? "女" : "男"}`);
  lines.push(`- 出生年份：${report.basic.birthYear}`);
  lines.push(`- 地区：${report.basic.region}`);
  lines.push(`- APOE：${report.basic.apoe ?? "—"}`);

  lines.push(`\n## 二、系统评估`);
  report.systems.forEach((s) => {
    const meta = SYSTEMS.find((x) => x.id === s.systemId);
    lines.push(`\n### ${meta?.title ?? s.title} · 风险：${riskLabel(s.riskLevel)}`);
    lines.push(`${s.oneLineSummary}`);
    if (s.drivingVariants.length) {
      lines.push(`\n**驱动位点：**`);
      s.drivingVariants.forEach((v) => lines.push(`- ${v.rsid}：${v.reason}`));
    }
    if (s.crossSystemLinks.length) {
      lines.push(`\n**与其他系统的交叉影响：**`);
      s.crossSystemLinks.forEach((c) => lines.push(`- ${SYSTEMS.find((x) => x.id === c.systemId)?.title} · ${c.relation === "synergy" ? "协同" : "拮抗"}：${c.mechanism}`));
    }
    lines.push(`\n${s.narrative}`);
  });

  lines.push(`\n## 三、补剂推荐（S/A/B）`);
  (["S", "A", "B"] as const).forEach((tier) => {
    const items = report.recommendations.filter((r) => r.tier === tier && r.type === "supplement");
    if (!items.length) return;
    lines.push(`\n### ${tier} 级`);
    items.forEach((r) => {
      lines.push(`- **${r.title}**${r.dose ? `（${r.dose}）` : ""} —— ${r.rationale.map((x) => `${x.geneSymbol ?? x.rsid ?? ""} ${x.mechanism}`).join("；")}`);
    });
  });

  lines.push(`\n## 四、监测指标`);
  lines.push(`| 指标 | 目标 | 频率 | 最近值 | 状态 |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  report.monitoring.forEach((m) => {
    const latest = m.userValues?.[0];
    lines.push(`| ${m.metric} | ${m.target} | ${m.frequency} | ${latest ? `${latest.value} ${latest.unit}` : "—"} | ${statusLabel(m.status)} |`);
  });

  lines.push(`\n## 五、回避清单`);
  report.avoidList.forEach((a) => {
    lines.push(`- ${a.title} —— ${a.rationale.map((x) => x.mechanism).join("；")}`);
  });

  lines.push(`\n## 六、未覆盖的重要位点`);
  report.appendix.uncoveredImportantRsids.forEach((u) =>
    lines.push(`- ${u.rsid}：${u.reason}`),
  );

  return lines.join("\n");
}

function riskLabel(r: string) {
  return r === "high" ? "高" : r === "medium" ? "中" : r === "low" ? "低" : "未知";
}
function statusLabel(s?: string) {
  if (s === "in_range") return "在目标内";
  if (s === "borderline") return "边缘";
  if (s === "out_of_range") return "偏离";
  return "未录入";
}

export function downloadFile(name: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
