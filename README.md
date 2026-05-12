# Genome Lens · 基因之镜

把分散的 基因 / HLA / 补剂 / 体检 记录整合成一份多系统的个性化遗传健康全景报告，并支持就报告中任意结论继续向 AI 追问。

> 本工具仅用于教育与自我管理参考，不构成医疗诊断。原始 SNP 文件仅在浏览器内解析，不会上传任何服务器。

## 技术栈

- Next.js 14（App Router） + React 18 + TypeScript strict
- Tailwind CSS + 自实现 shadcn/ui 风格组件
- Radix UI 原语（Dialog / Sheet / Tabs / Accordion / Select / Progress / Tooltip / Toast / ScrollArea）
- lucide-react 图标
- Recharts（监测 sparkline）
- Zustand + localStorage 持久化

## 快速开始

```bash
npm install   # 或 pnpm install / yarn
npm run dev   # 启动开发服务，访问 http://localhost:3000
```

首次进入会跳转到 `/onboarding`，可以选择「使用示例数据」快速跑通整条数据流。

## 项目结构

```
genome-lens/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # 入口重定向到 onboarding / dashboard
│   ├── onboarding/page.tsx      # 4 步上传向导
│   ├── dashboard/page.tsx       # 全景仪表盘
│   ├── system/[id]/page.tsx     # 系统详情
│   ├── supplements/page.tsx     # 补剂管理
│   ├── monitoring/page.tsx      # 监测追踪
│   ├── history/page.tsx         # 历史快照
│   ├── settings/page.tsx        # API Key、数据管理
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn 风格基础组件
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── app-shell.tsx
│   ├── ai-drawer.tsx            # 右侧 AI 追问抽屉（全局）
│   ├── locus-drawer.tsx         # 位点详情抽屉（全局）
│   ├── system-card.tsx
│   ├── risk-badge.tsx
│   └── disclaimer.tsx
├── lib/
│   ├── utils.ts
│   ├── export.ts                # 报告导出（Markdown）
│   ├── mock-llm.ts              # mockAskAboutContext / askWithLLM
│   ├── report-builder.ts        # buildReport 静态规则实现
│   ├── parser/
│   │   ├── index.ts
│   │   └── wegene.ts            # parseGeneFile + inferApoe
│   └── annotation/
│       └── key-rsids.ts         # 关键 SNP 字典占位
├── content/
│   ├── mock/
│   │   ├── user-genes.ts        # 占位用户分型
│   │   ├── report.ts            # MOCK_REPORT
│   │   └── rules.json
│   └── systems/                 # 各系统机制 MDX 占位
├── store/index.ts               # Zustand store + persist
├── types/index.ts               # 全局 TS 类型 + SYSTEMS 元数据
└── README.md
```

## 关键函数签名（约定）

```ts
// 浏览器内分块解析 raw txt，命中关键位点字典
async function parseGeneFile(
  file: File,
  onProgress: (parsed: number, found: number) => void,
): Promise<GenotypedGene[]>

// 推断 APOE 分型
function inferApoe(rs429358: string, rs7412: string): string | null

// 基于规则构建报告
function buildReport(input: {
  basic: BasicInfo;
  genes: GenotypedGene[];
  hla: HlaRecord[];
  supplements: SupplementItem[];
  labs: LabResult[];
}): GenomeReport

// AI 追问 - mock
async function mockAskAboutContext(
  question: string,
  context: ChatContext,
  report: GenomeReport,
): Promise<ChatMessage>

// AI 追问 - 真实接口（Anthropic Messages API）
async function askWithLLM(
  question: string,
  context: ChatContext,
  report: GenomeReport,
  apiKey: string,
  model?: string,
): Promise<ChatMessage>
```

## 替换 mock 内容

- 用户分型数据：`content/mock/user-genes.ts`
- 完整报告：`content/mock/report.ts`（默认基于 `buildReport` 即时构建）
- 关键 SNP 字典：`lib/annotation/key-rsids.ts`
- 系统机制叙述：`lib/report-builder.ts` 中 `narrative` 字段 + `content/systems/*.mdx`
- 规则 JSON：`content/mock/rules.json`（保留接口，待扩展规则引擎）

## 接入真实 Claude API

1. 打开 `/settings`
2. 在 *AI 接入* 填入 Claude API Key（保存在 localStorage）
3. 选择模型（默认 `claude-opus-4-7`）
4. 点击「测试连接」确认可调通
5. 任意页面右上「向 AI 追问」抽屉将切换为真实调用

> 出于演示便利，浏览器侧直接调用了 `https://api.anthropic.com/v1/messages` 并启用 `anthropic-dangerous-direct-browser-access`。生产环境建议改为后端代理（Next.js Route Handler）以避免 Key 暴露与 CORS 限制。

## 隐私要点

- 基因 raw txt **仅在浏览器内分块解析**（每块 10 MB，主线程让出），原始 SNP 不出本机。
- 报告 / 录入数据使用 `localStorage` 持久化，可在「设置 → 数据管理」一键导出 JSON 或清除。
- AI 追问只会随请求带上：当前上下文（systemId / rsid / geneSymbol / topic）+ 报告中相关系统摘要，**不会**发送原始 SNP 列表。

## 设计风格基线

- 色板：白色 + slate 灰阶 + 单一冷色调强调色 **#1F6B4D**（墨绿）
- 风险四档色：高 `#DC2626` / 中 `#EA580C` / 低 `#16A34A` / 未知 `#94A3B8`
- 圆角统一 `12px` (rounded-xl)，边框 `1px slate-200`，阴影 `shadow-sm`
- 表格优先、图表克制；信息密度高但留白足

## 后续可扩展

- 把 `content/mock/rules.json` 升级为可加载的规则引擎，替代 `report-builder.ts` 内的硬编码分支
- 把 `lib/annotation/key-rsids.ts` 替换为外部 JSON / 数据库（dbSNP / ClinVar / SNPedia）
- 把 mock 用户数据切换为真实文件流：在 `/onboarding` 步骤 2 拖入 WeGene / 23andMe 原始 txt 即可
- PDF 导出（占位按钮）、报告分享（占位按钮）
- 后端代理 LLM 请求 + 服务端报告生成
