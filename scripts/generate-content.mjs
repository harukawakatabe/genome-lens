#!/usr/bin/env node
/**
 * 按 ref/03_内容生成提示词.md 批量生成真实内容：
 *  - F：8 个系统 oneLineSummary
 *  - B：~20 个位点 annotation
 *  - A：8 个系统 narrative
 *  - C/D/E/H/I：按需扩展
 *
 * 读 .env.local 拿 ANTHROPIC_API_KEY / BASE_URL / MODEL，直接调用 Anthropic 兼容接口。
 * 结果写到 content/generated/*.json，由 report-builder / key-rsids 读取。
 *
 * 用法：
 *   node scripts/generate-content.mjs              # 全量
 *   node scripts/generate-content.mjs --only=F,B   # 只跑指定模块
 *   node scripts/generate-content.mjs --probe      # 仅连通性测试
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ---------- 加载 .env.local ----------
function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) {
    console.error("缺少 .env.local");
    process.exit(1);
  }
  const text = readFileSync(envPath, "utf-8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
    if (!m) continue;
    if (line.trim().startsWith("#")) continue;
    out[m[1]] = m[2];
  }
  return out;
}
const env = loadEnv();
const API_KEY = env.ANTHROPIC_API_KEY;
const BASE_URL = (env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
const MODEL = env.NEXT_PUBLIC_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

if (!API_KEY) {
  console.error("缺少 ANTHROPIC_API_KEY");
  process.exit(1);
}

const ENDPOINT = /\/v1\/messages$/.test(BASE_URL)
  ? BASE_URL
  : /\/v1$/.test(BASE_URL)
    ? `${BASE_URL}/messages`
    : `${BASE_URL}/v1/messages`;

console.log(`[env] model=${MODEL}  endpoint=${ENDPOINT}`);

// ---------- LLM 调用 ----------
async function callLLM({ system, user, maxTokens = 2000, retries = 2 }) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status} ${err.slice(0, 300)}`);
      }
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? "";
      if (!text) throw new Error("空响应");
      return text;
    } catch (e) {
      console.warn(`  重试 ${i + 1}/${retries + 1}: ${e.message}`);
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ---------- 前置：用户画像 ----------
const USER_PROFILE = `
- 性别：女
- 出生年份：1992
- APOE 分型：ε3/ε4（杂合）
- 关键基因型：
  · MTHFR rs1801133 (C677T) = CT 杂合
  · MTHFR rs1801131 (A1298C) = GG 纯合（复合杂合）
  · MTRR rs1801394 (A66G) = AG 杂合
  · COMT rs4680 (Val158Met) = GG (Val/Val 高活性)
  · MAOA rs6323 = GG 高活性
  · TCN2 rs1801198 (P259R) = GG 纯合（B12 运输受损）
  · BCO1 rs7501331 (R267S) = TT 纯合
  · BCO1 rs12934922 (A379V) = TT 纯合（双纯合）
  · IL6 rs1800795 (-174G/C) = GG 高产型
  · VDR rs2228570 (FokI) = CT 杂合
  · BDNF rs6265 (Val66Met) = CT (Val/Met)
  · PPARGC1A rs8192678 (Gly482Ser) = AA (Ser/Ser)
  · CYP1B1 rs1056836 (L432V) = CG 杂合
  · GSTP1 rs1695 (I105V) = AG 杂合
- HLA：B*27:05、DRB1*15:01、DRB1*04:03
- 体检：Hcy 11.2、25-OH-D 24 ng/mL、hsCRP 2.1、铁蛋白 38
`.trim();

const ROLE_PREAMBLE = `你是同时具备以下身份的整合医学专家：免疫学家、功能医学专家、药动力学家、神经学专家、遗传学专家、营养基因组学家。
你正在为个人化基因解读 Web 应用（Genome Lens）生成结构化内容。输出将被前端直接渲染，必须严格遵循指定格式。

全局约束：
1. 结论必须基于基因型之间的交叉影响和叠加效应，不能孤立分析单个位点
2. 必须量化：写"酶活性约 30-40%"、"风险升高 3-4 倍"，不写"可能影响"
3. 补剂形式具体：写"甲基钴胺舌下含服 1000 mcg"，不写"补 B12"
4. 中文撰写，专业术语保留英文对照
5. 不使用 emoji，不使用 Markdown 分隔线
6. 仅输出要求的内容，不要寒暄`;

const SYSTEMS = [
  { id: "neuro", title: "神经与脑", genesHint: "APOE / BDNF" },
  { id: "inflammation", title: "炎症与免疫", genesHint: "IL6 / TNF / HLA" },
  { id: "methylation", title: "甲基化系统", genesHint: "MTHFR / MTR / MTRR" },
  { id: "vitamin", title: "维生素代谢", genesHint: "VDR / BCO1 / TCN2" },
  { id: "estrogen", title: "雌激素代谢", genesHint: "CYP1A1 / CYP1B1 / COMT" },
  { id: "detox", title: "氧化与解毒", genesHint: "GSTP1 / GSTM1 / SULT" },
  { id: "neurotransmitter", title: "神经递质", genesHint: "COMT / MAOA" },
  { id: "cardio", title: "心血管与代谢", genesHint: "PPARGC1A / TCF7L2 / APOE" },
];

const KEY_RSIDS_FOR_B = [
  { rsid: "rs429358", gene: "APOE", variant: "C112R", genotype: "CT", system: "neuro" },
  { rsid: "rs7412", gene: "APOE", variant: "R158C", genotype: "CC", system: "neuro" },
  { rsid: "rs6265", gene: "BDNF", variant: "Val66Met", genotype: "CT", system: "neuro" },
  { rsid: "rs1800795", gene: "IL6", variant: "-174G/C", genotype: "GG", system: "inflammation" },
  { rsid: "rs1800629", gene: "TNF", variant: "-308G/A", genotype: "GG", system: "inflammation" },
  { rsid: "rs1801133", gene: "MTHFR", variant: "C677T", genotype: "CT", system: "methylation" },
  { rsid: "rs1801131", gene: "MTHFR", variant: "A1298C", genotype: "GG", system: "methylation" },
  { rsid: "rs1801394", gene: "MTRR", variant: "A66G", genotype: "AG", system: "methylation" },
  { rsid: "rs1805087", gene: "MTR", variant: "A2756G", genotype: "AA", system: "methylation" },
  { rsid: "rs2228570", gene: "VDR", variant: "FokI", genotype: "CT", system: "vitamin" },
  { rsid: "rs7501331", gene: "BCO1", variant: "R267S", genotype: "TT", system: "vitamin" },
  { rsid: "rs12934922", gene: "BCO1", variant: "A379V", genotype: "TT", system: "vitamin" },
  { rsid: "rs1801198", gene: "TCN2", variant: "P259R", genotype: "GG", system: "vitamin" },
  { rsid: "rs4646903", gene: "CYP1A1", variant: "MspI", genotype: "TT", system: "estrogen" },
  { rsid: "rs1056836", gene: "CYP1B1", variant: "L432V", genotype: "CG", system: "estrogen" },
  { rsid: "rs1695", gene: "GSTP1", variant: "I105V", genotype: "AG", system: "detox" },
  { rsid: "rs4680", gene: "COMT", variant: "Val158Met", genotype: "GG", system: "neurotransmitter" },
  { rsid: "rs6323", gene: "MAOA", variant: "R297R", genotype: "GG", system: "neurotransmitter" },
  { rsid: "rs8192678", gene: "PPARGC1A", variant: "Gly482Ser", genotype: "AA", system: "cardio" },
  { rsid: "rs7903146", gene: "TCF7L2", variant: "IVS3", genotype: "CC", system: "cardio" },
];

// ---------- 工具：解析 JSON ----------
function extractJson(text) {
  // 去 ```json fence
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) ?? text.match(/```\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  // 找第一个 { 或 [
  const start = Math.min(
    ...["{", "["]
      .map((c) => raw.indexOf(c))
      .filter((i) => i >= 0),
  );
  if (!Number.isFinite(start)) throw new Error("未找到 JSON 起点");
  const candidate = raw.slice(start).trim();
  return JSON.parse(candidate);
}

// ---------- 输出目录 ----------
const OUT_DIR = join(root, "content", "generated");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function writeJson(name, data) {
  writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2), "utf-8");
  console.log(`  ✓ ${name}`);
}

// ---------- 模块 F：一句话结论 ----------
async function genF() {
  console.log("[F] 一句话结论 × 8");
  const out = {};
  for (const sys of SYSTEMS) {
    process.stdout.write(`  · ${sys.title} ... `);
    const text = await callLLM({
      system: ROLE_PREAMBLE,
      user: `任务：为「${sys.title}」系统生成一句话结论（仪表盘卡片用）。

用户画像：
${USER_PROFILE}

本系统主要相关基因：${sys.genesHint}

要求：
- 一句话，30-55 个中文字
- 必须点明本系统的核心驱动位点（1-2 个）与方向（风险/保护/中性）
- 不写"建议"、"应该"，只描述事实
- 不要 emoji、不要引号

只输出这一句话，不要其他内容。`,
      maxTokens: 200,
    });
    out[sys.id] = text.trim().replace(/^["「『]|["」』]$/g, "");
    process.stdout.write(`${out[sys.id].slice(0, 40)}...\n`);
  }
  writeJson("F-summaries.json", out);
  return out;
}

// ---------- 模块 B：位点 annotation ----------
async function genB() {
  console.log(`[B] 位点 annotation × ${KEY_RSIDS_FOR_B.length}`);
  const out = {};
  // 智谱接口似乎对并发敏感，串行+ batch
  for (const rs of KEY_RSIDS_FOR_B) {
    process.stdout.write(`  · ${rs.rsid} ${rs.gene} ... `);
    try {
      const text = await callLLM({
        system: ROLE_PREAMBLE,
        user: `任务：为 ${rs.gene} ${rs.variant} (${rs.rsid}) 生成位点详情卡片的 annotation 字段。

用户上下文：
${USER_PROFILE}

本位点用户分型：${rs.genotype}

输出严格 JSON（不要任何 Markdown fence）：
{
  "annotation": "1-2 句话，60-120 字。说明本变异在蛋白功能层做了什么，以及在用户这种分型下功能改变的方向与量化幅度（如酶活性约 30-40%）。点出与用户其他相关位点的协同/拮抗。",
  "effectDirection": "loss_of_function | gain_of_function | altered_substrate | regulatory | unknown",
  "userImplication": "30-60 字，本分型对用户日常的实际影响（症状方向 / 营养需求 / 用药敏感性等其一）"
}`,
        maxTokens: 600,
      });
      const json = extractJson(text);
      out[rs.rsid] = json;
      process.stdout.write(`✓\n`);
    } catch (e) {
      console.warn(`  × ${rs.rsid}: ${e.message}`);
      out[rs.rsid] = { annotation: "（生成失败，待补）", effectDirection: "unknown", userImplication: "" };
    }
  }
  writeJson("B-annotations.json", out);
  return out;
}

// ---------- 模块 A：系统 narrative ----------
async function genA() {
  console.log("[A] 系统 narrative × 8");
  const out = {};
  for (const sys of SYSTEMS) {
    process.stdout.write(`  · ${sys.title} ... `);
    try {
      const text = await callLLM({
        system: ROLE_PREAMBLE,
        user: `任务：为「${sys.title}」生成系统详情页的机制深读段落。

用户画像：
${USER_PROFILE}

本系统相关基因：${sys.genesHint}

输出 Markdown，结构如下（不要其他前后说明）：

## 系统概述
{2-3 段，介绍本系统在人体中的作用，本次涉及的核心通路}

## 用户分型解析
{逐个位点展开：分型 → 量化影响 → 蛋白功能层的解释}

## 叠加效应
{核心：本系统内多个位点的协同/拮抗如何形成"瓶颈"或"双重压力"，给出机制层的串联}

## 与其他系统的交叉
{至少 2 个跨系统协同点，每点给出机制句}

## 临床表现指征
{可能的早期症状或亚临床信号，注明"非诊断性"}

总长度 800-1500 字。`,
        maxTokens: 3500,
      });
      out[sys.id] = text.trim();
      process.stdout.write(`✓ ${text.length} 字符\n`);
    } catch (e) {
      console.warn(`  × ${sys.title}: ${e.message}`);
      out[sys.id] = "";
    }
  }
  writeJson("A-narratives.json", out);
  return out;
}

// ---------- 模块 C：补剂推荐 ----------
async function genC() {
  console.log("[C] 补剂矩阵");
  const text = await callLLM({
    system: ROLE_PREAMBLE,
    user: `任务：为该用户生成补剂推荐矩阵（S/A/B 三档 + 回避清单）。

用户画像：
${USER_PROFILE}

输出严格 JSON：
{
  "recommendations": [
    {
      "title": "补剂名（含形式，如 5-MTHF 活性叶酸）",
      "tier": "S | A | B",
      "type": "supplement",
      "dose": "具体剂量 + 频次 + 时机（如 400-1000 mcg 早餐随餐）",
      "rationale": [
        {"rsid": "rs1801133", "geneSymbol": "MTHFR", "mechanism": "C677T 杂合，5-MTHF 转化下降约 30%"}
      ],
      "appliesToSystems": ["methylation"]
    }
  ],
  "avoid": [
    {
      "title": "需回避的项目",
      "tier": "S | A | B",
      "rationale": [{"geneSymbol": "MTHFR", "mechanism": "..."}],
      "appliesToSystems": ["methylation"]
    }
  ]
}

要求：
- S 级 4-6 项，A 级 3-5 项，B 级 2-4 项，avoid 3-5 项
- 每项必须给出至少 1 个对应 rsid 或 geneSymbol 与机制
- 形式必须具体（如"甲基钴胺舌下"而非"维 B12"）
- 不要寒暄，仅 JSON。`,
    maxTokens: 4500,
  });
  const json = extractJson(text);
  writeJson("C-supplements.json", json);
  return json;
}

// ---------- 模块 D：监测矩阵 ----------
async function genD() {
  console.log("[D] 监测指标");
  const text = await callLLM({
    system: ROLE_PREAMBLE,
    user: `任务：为该用户生成监测指标矩阵。

用户画像：
${USER_PROFILE}

输出严格 JSON 数组：
[
  {
    "metric": "Hcy",
    "target": "< 8 μmol/L",
    "frequency": "每 6 个月",
    "rationale": "1-2 句，说明为什么这个用户特别需要监测这项，结合具体 rsid"
  }
]

要求：
- 6-10 个指标
- 每个 rationale 必须引用用户的具体基因型作为依据
- 仅 JSON，不要寒暄`,
    maxTokens: 2500,
  });
  const json = extractJson(text);
  writeJson("D-monitoring.json", json);
  return json;
}

// ---------- 模块 E：交叉影响 ----------
async function genE() {
  console.log("[E] 系统交叉影响 × 8");
  const out = {};
  for (const sys of SYSTEMS) {
    process.stdout.write(`  · ${sys.title} ... `);
    try {
      const text = await callLLM({
        system: ROLE_PREAMBLE,
        user: `任务：为「${sys.title}」生成与其他 7 个系统的交叉影响列表。

用户画像：
${USER_PROFILE}

其他系统：神经与脑、炎症与免疫、甲基化系统、维生素代谢、雌激素代谢、氧化与解毒、神经递质、心血管与代谢（去掉自身）

输出严格 JSON 数组：
[
  {
    "systemId": "inflammation",
    "relation": "synergy | antagonism",
    "mechanism": "1 句话，30-60 字，引用具体 rsid，说明机制层的协同或拮抗"
  }
]

要求：
- 必须给出 3-5 条
- systemId 取值：neuro | inflammation | methylation | vitamin | estrogen | detox | neurotransmitter | cardio
- 不能包含与「${sys.title}」自身的链接
- 仅 JSON`,
        maxTokens: 1500,
      });
      out[sys.id] = extractJson(text);
      process.stdout.write(`✓\n`);
    } catch (e) {
      console.warn(`  × ${sys.title}: ${e.message}`);
      out[sys.id] = [];
    }
  }
  writeJson("E-cross-system.json", out);
  return out;
}

// ---------- 模块 H：未覆盖位点 ----------
async function genH() {
  console.log("[H] 未覆盖位点补检建议");
  const userRsids = KEY_RSIDS_FOR_B.map((r) => r.rsid).join(", ");
  const text = await callLLM({
    system: ROLE_PREAMBLE,
    user: `任务：基于该用户的已检测位点列表，给出 3-6 条建议补检的重要位点。

用户画像：
${USER_PROFILE}

用户已检测：${userRsids}

输出严格 JSON 数组：
[
  {
    "rsid": "rs1801272",
    "geneSymbol": "NAT2",
    "priority": "S | A | B",
    "whyImportantForUser": "结合用户已有分型，本位点为什么重要（必须个体化，不要通用说法）",
    "suggestedAction": "建议的补检渠道或检测套餐方向"
  }
]

要求：
- 优先级 S 排前
- 给出的 rsid 必须真实存在且与用户画像有强关联
- 仅 JSON`,
    maxTokens: 1800,
  });
  const json = extractJson(text);
  writeJson("H-uncovered.json", json);
  return json;
}

// ---------- 模块 I：补剂冲突规则 ----------
async function genI() {
  console.log("[I] 补剂冲突规则");
  const text = await callLLM({
    system: ROLE_PREAMBLE,
    user: `任务：基于该用户的基因型，列出在补剂搭配中可能出现的冲突 / 警告规则。

用户画像：
${USER_PROFILE}

输出严格 JSON 数组：
[
  {
    "trigger": "用户清单中含 alpha-tocopherol 且日剂量 ≥ 400 IU",
    "severity": "high | medium | low",
    "title": "短标题",
    "reason": "1-2 句话说明为什么这个用户尤其要警惕，引用具体 rsid",
    "suggestion": "替代方案 / 安全用法"
  }
]

要求：
- 4-7 条规则
- 必须结合用户的 APOE ε4 / MTHFR 复合杂合 / COMT 高活 / BCO1 双纯合 / IL-6 高产 / TCN2 GG 等具体分型
- 仅 JSON`,
    maxTokens: 2000,
  });
  const json = extractJson(text);
  writeJson("I-conflicts.json", json);
  return json;
}

// ---------- 主控 ----------
const args = process.argv.slice(2);
const probe = args.includes("--probe");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",").map((x) => x.trim().toUpperCase()) : null;

async function main() {
  if (probe) {
    console.log("--- 连通性测试 ---");
    const text = await callLLM({
      system: "你是测试助手。",
      user: "用一句话回复：连接成功。",
      maxTokens: 50,
    });
    console.log("响应:", text);
    return;
  }

  const tasks = [
    ["F", genF],
    ["B", genB],
    ["A", genA],
    ["C", genC],
    ["D", genD],
    ["E", genE],
    ["H", genH],
    ["I", genI],
  ];

  for (const [key, fn] of tasks) {
    if (only && !only.includes(key)) continue;
    const t0 = Date.now();
    try {
      await fn();
      console.log(`[${key}] done · ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
    } catch (e) {
      console.error(`[${key}] FAILED: ${e.message}\n`);
    }
  }
  console.log("全部完成。生成结果在 content/generated/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
