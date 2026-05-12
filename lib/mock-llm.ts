import type { ChatContext, ChatMessage, GenomeReport } from "@/types";
import { uid } from "@/lib/utils";

/**
 * AI 追问 - mock 版本。
 * 根据 context.topic 与 context.systemId / rsid / geneSymbol 拼出结构化占位回复。
 * 设置中接入真实 Claude API Key 后调用 askWithLLM。
 */
export async function mockAskAboutContext(
  question: string,
  context: ChatContext,
  report: GenomeReport,
): Promise<ChatMessage> {
  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

  const sys = context.systemId ? report.systems.find((s) => s.systemId === context.systemId) : undefined;
  const gene = context.rsid
    ? report.genes.find((g) => g.rsid === context.rsid)
    : context.geneSymbol
      ? report.genes.find((g) => g.geneSymbol === context.geneSymbol)
      : undefined;

  const topicTitle: Record<string, string> = {
    mechanism: "机制解释",
    dose: "剂量建议",
    alternatives: "替代方案",
    monitoring: "监测建议",
    risk: "风险评估",
  };

  const lines: string[] = [];
  lines.push(`**${topicTitle[context.topic ?? "mechanism"] ?? "回答"}**`);
  lines.push("");
  if (gene) {
    lines.push(`- 位点：${gene.geneSymbol} ${gene.variantName ?? ""} (${gene.rsid})`);
    lines.push(`- 你的分型：${gene.genotype} · ${effectLabel(gene.effectType)}`);
  }
  if (sys) {
    lines.push(`- 系统：${sys.title} · 当前评估 **${riskLabel(sys.riskLevel)}**`);
  }
  lines.push("");

  switch (context.topic ?? "mechanism") {
    case "mechanism":
      lines.push(
        gene
          ? `${gene.geneSymbol} ${gene.variantName ?? ""} 的机制简述：${gene.annotation} 你的分型 ${gene.genotype} 处于 ${effectLabel(gene.effectType)} 状态，会从酶活性 / 受体亲和 / 蛋白稳定性三个角度影响下游通路。`
          : "结合你的整体数据，这一结论主要由 MTHFR 复合杂合 + APOE ε4 + IL-6 高产共同驱动，呈现 神经-炎症-甲基化 的多通路放大。",
      );
      break;
    case "dose":
      lines.push("基于你的分型与体检值的占位剂量区间（实际请遵医嘱）：");
      lines.push("- 5-MTHF：400-1000 mcg / 日");
      lines.push("- 甲钴胺：500-1000 mcg / 日");
      lines.push("- 维 D3：2000-4000 IU / 日（同补 K2 100 mcg）");
      lines.push("- DHA：≥ 500 mg / 日");
      break;
    case "alternatives":
      lines.push("常见可替代选项：");
      lines.push("- 5-MTHF → 葡甲胺盐 / 钙盐均可，避免合成 folic acid");
      lines.push("- 甲钴胺 → 腺苷钴胺组合（覆盖髓鞘与线粒体两条路径）");
      lines.push("- 视黄醇 → 鳕鱼肝油 / 动物肝脏（注意 A 总量上限）");
      break;
    case "monitoring":
      lines.push("建议优先纳入跟踪的指标：");
      lines.push("- Hcy（目标 < 8 μmol/L）");
      lines.push("- 25-OH-D（目标 40-60 ng/mL）");
      lines.push("- holoTC / MMA（评估真实 B12 状态）");
      lines.push("- hsCRP（< 1 mg/L）");
      break;
    case "risk":
      lines.push(
        sys
          ? `${sys.title} 当前评估 ${riskLabel(sys.riskLevel)}：${sys.oneLineSummary}`
          : "整体而言，神经 / 炎症免疫 / 甲基化 / 维生素代谢 4 个系统处于较高风险，是干预的重点。",
      );
      break;
  }
  lines.push("");
  lines.push("> 这是示例回复（mock），前往 设置 接入 Claude API Key 后可得到基于你完整报告的个性化追问。");

  return {
    id: uid("msg"),
    role: "assistant",
    content: lines.join("\n"),
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * 真实 LLM 接口（预留）。当前调用 Anthropic Messages API 的最小实现。
 * 仅用于演示，可按需要替换为后端代理以避免暴露 Key。
 */
export async function askWithLLM(
  question: string,
  context: ChatContext,
  report: GenomeReport,
  apiKey: string,
  model: string = "claude-opus-4-7",
): Promise<ChatMessage> {
  const systemPrompt = buildSystemPrompt(report);
  const userPrompt = buildUserPrompt(question, context, report);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM 请求失败: ${res.status} ${err}`);
  }
  const data = await res.json();
  const text =
    data?.content?.[0]?.text ??
    "（接口返回为空，请检查 API Key 与模型配置）";
  return {
    id: uid("msg"),
    role: "assistant",
    content: text,
    timestamp: new Date().toISOString(),
    context,
  };
}

function buildSystemPrompt(report: GenomeReport): string {
  return [
    "你是一名严谨的功能医学顾问，回答需要：",
    "1. 必须基于用户提供的基因 / HLA / 补剂 / 体检数据进行个体化解读；",
    "2. 给出量化区间与对应的基因依据；",
    "3. 提示这不是医疗诊断、不可替代医生；",
    "4. 中文输出，结构化、不啰嗦。",
    "",
    `用户基础信息: ${JSON.stringify(report.basic)}`,
    `用户系统评估: ${report.systems.map((s) => `${s.title}=${s.riskLevel}`).join(", ")}`,
  ].join("\n");
}

function buildUserPrompt(question: string, context: ChatContext, report: GenomeReport): string {
  const gene = context.rsid ? report.genes.find((g) => g.rsid === context.rsid) : undefined;
  const sys = context.systemId ? report.systems.find((s) => s.systemId === context.systemId) : undefined;
  return [
    `当前上下文: ${JSON.stringify(context)}`,
    gene ? `位点详情: ${JSON.stringify(gene)}` : "",
    sys ? `系统评估: ${sys.title} / ${sys.riskLevel} / ${sys.oneLineSummary}` : "",
    "",
    `问题: ${question}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function riskLabel(r: string): string {
  return r === "high" ? "高风险" : r === "medium" ? "中风险" : r === "low" ? "低风险" : "未知";
}
function effectLabel(e: string): string {
  return e === "homo" ? "纯合" : e === "hetero" ? "杂合" : e === "wild" ? "野生型" : "未知";
}
