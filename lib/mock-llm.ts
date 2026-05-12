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
 *
 * baseUrl: 可选自定义 Anthropic 兼容端点（如代理 / 国内中转），默认官方地址。
 *          约定写到 host 即可（"https://api.anthropic.com"），自动补 "/v1/messages"。
 *          若已包含 "/v1/messages" 则原样使用。
 */
export async function askWithLLM(
  question: string,
  context: ChatContext,
  report: GenomeReport,
  apiKey: string,
  model: string = "claude-opus-4-7",
  baseUrl?: string,
): Promise<ChatMessage> {
  const systemPrompt = buildSystemPrompt(report, context);
  const userPrompt = buildUserPrompt(question, context, report);

  const endpoint = buildEndpoint(baseUrl);
  const res = await fetch(endpoint, {
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

/**
 * 运行时 system prompt（对齐 ref/03_内容生成提示词.md「提示词 G」）。
 * 完整 GenomeReport 以 JSON 形式放进 <report>，当前追问聚焦在 <context>。
 */
export function buildSystemPrompt(report: GenomeReport, context: ChatContext = {}): string {
  const gene = context.rsid ? report.genes.find((g) => g.rsid === context.rsid) : undefined;
  const reportJson = JSON.stringify(report, null, 0);
  return [
    "你是一名整合医学遗传咨询师，同时具备分子生物学、营养医学和免疫遗传学背景。",
    "",
    "你正在帮助一位用户深入理解他/她自己的基因检测结果。用户的完整基因报告以 JSON 形式提供在下方 <report> 标签内。用户的当前追问聚焦在 <context> 标签所示的特定位点/系统/主题上。",
    "",
    "回答原则：",
    "1. 紧扣 <context> 给出的上下文，不要泛泛而谈",
    "2. 引用具体的 rsid 和用户分型，让用户能追溯",
    "3. 量化具体：写百分比、倍数、剂量范围",
    "4. 如涉及补剂剂量，必须给出形式（如\"甲基钴胺舌下\"而非\"B12\"）+ 剂量范围 + 与餐次/时间的关系",
    "5. 必须说明监测方法：如何知道补对了",
    "6. 若用户问的方向超出基因证据范围，明确告知\"该方向缺乏遗传指征\"，不要硬凑",
    "7. 在回答末尾用一行总结\"下一步建议\"",
    "8. 中文，不使用 emoji，不使用 Markdown 分隔线",
    "9. 长度 200-500 字（除非用户要求详尽展开）",
    "",
    "医疗免责：所有内容仅为基于基因型的功能医学建议，不替代医生处方。涉及处方药、激素治疗、慢性病管理时务必告知用户咨询临床医生。",
    "",
    "<report>",
    reportJson,
    "</report>",
    "",
    "<context>",
    `- 当前系统：${context.systemId ?? "（未指定）"}`,
    `- 当前位点：${gene ? `${gene.geneSymbol} (${gene.rsid})` : context.geneSymbol ?? "（未指定）"}`,
    `- 用户分型：${gene?.genotype ?? "（未指定）"}`,
    `- 主题：${context.topic ?? "（自由追问）"}`,
    "</context>",
  ].join("\n");
}

/** User prompt：运行时只拼接用户真实问题（按 03 文档 G）。 */
export function buildUserPrompt(question: string, _context: ChatContext, _report: GenomeReport): string {
  return question;
}

/**
 * 通过 /api/chat 服务端代理调用 LLM，API Key 保留在服务器不暴露给浏览器。
 */
export async function askViaProxy(
  question: string,
  context: ChatContext,
  report: GenomeReport,
  model: string = "claude-opus-4-7",
  baseUrl?: string,
): Promise<ChatMessage> {
  const systemPrompt = buildSystemPrompt(report, context);
  const userPrompt = buildUserPrompt(question, context, report);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      baseUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `代理请求失败: ${res.status}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "（接口返回为空）";
  return {
    id: uid("msg"),
    role: "assistant",
    content: text,
    timestamp: new Date().toISOString(),
    context,
  };
}

function buildEndpoint(baseUrl?: string): string {
  const fallback = "https://api.anthropic.com";
  const raw = (baseUrl ?? fallback).trim().replace(/\/+$/, "");
  if (!raw) return `${fallback}/v1/messages`;
  if (/\/v1\/messages$/.test(raw)) return raw;
  if (/\/v1$/.test(raw)) return `${raw}/messages`;
  return `${raw}/v1/messages`;
}

function riskLabel(r: string): string {
  return r === "high" ? "高风险" : r === "medium" ? "中风险" : r === "low" ? "低风险" : "未知";
}
function effectLabel(e: string): string {
  return e === "homo" ? "纯合" : e === "hetero" ? "杂合" : e === "wild" ? "野生型" : "未知";
}
