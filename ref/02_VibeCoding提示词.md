# Vibe Coding 提示词：Genome Lens MVP

> 本提示词**只管页面、UI、交互、数据结构、Mock 函数签名**，不管基因解读的具体内容。
> 内容由 `03_内容生成提示词.md` 单独生成后填入 `content/` 目录作为静态资源。
>
> 用法：把以下整段（从"## 提示词主体"开始）复制到 v0 / Lovable / Bolt / Cursor / Claude 等 vibe coding 工具中，一次性生成完整可运行的 Next.js 项目骨架。

---

## 使用说明

1. 先用本 prompt 生成骨架（页面 + 组件 + mock 数据结构）
2. 用 `03_内容生成提示词.md` 中的各章节 prompt 分别生成基因解读 JSON
3. 把生成的 JSON 放到 `content/` 目录，替换骨架中的占位 mock
4. 配置 Claude API Key（可选），启用真实追问

---

## 提示词主体

---

你是一个资深全栈产品工程师和健康类 SaaS 产品设计师。请帮我生成一个现代化 Web 产品 MVP，产品名称为「Genome Lens」（基因之镜）。

## 产品目标

用户上传自己的基因原始数据（WeGene / 23andMe txt）+ HLA 分型 + 补剂清单 + 体检结果，系统在浏览器端解析关键 SNP 位点，生成一份多系统的个性化遗传健康全景报告，并支持就报告中任意结论继续向 AI 追问。

核心功能：

1. 多步上传向导（基础信息 / 基因数据 / HLA / 补剂 / 体检）
2. 全景仪表盘（系统风险卡片 + 补剂矩阵 + 监测指标矩阵 + 回避清单）
3. 8 个系统的详情页（神经 / 炎症免疫 / 甲基化 / 维生素 / 雌激素 / 解毒 / 神经递质 / 心血管代谢）
4. 单基因位点详情抽屉
5. AI 追问抽屉（默认 mock 回复，预留真实 LLM 接口）
6. 补剂管理与冲突检测
7. 监测指标追踪
8. 报告导出（Markdown / PDF 占位）

## 目标用户

- 拿到基因检测原始文件但读不懂的人（WeGene、23andMe、Ancestry 用户）
- 功能医学 / 整合医学爱好者
- 长期吃补剂希望系统化评估的人
- 希望把分散的基因 / HLA / 体检 / 补剂记录整合成一张系统图的人

不是医疗诊断系统，需在显著位置标注免责声明。

## 产品风格

整体界面参考 Linear、Notion、Stripe Dashboard、Bear 的设计风格。

要求：

- 专业、克制、医疗/科研感、阅读舒适
- 白色背景 + 高级灰文本（slate-700 / slate-500）+ 单一冷色调强调色（墨绿 #1F6B4D 作为 primary）
- 风险等级用四档色：高=#DC2626 红、中=#EA580C 橙、低=#16A34A 绿、未知=#94A3B8 灰
- 卡片式布局，圆角 12px，细边框 1px slate-200，微阴影 shadow-sm
- 左侧固定导航 260px + 中央内容区 max-w-7xl + 右侧 AI 抽屉 420px
- 字体使用系统无衬线（中文 PingFang/思源黑体，英文 Inter）
- 信息密度高，但页面留白足以保证阅读舒适
- 数据可视化：风险评级用 4 段色条；监测指标用迷你 sparkline；交叉影响用简洁的有向连线
- 反面约束：不要花哨；不要游戏化；不要过度渐变；不要拟物；不要表情符号；不要紫色霓虹
- 表格优先，图表克制（医疗内容需要严肃感）

## 技术栈要求

- 使用 Next.js 14（App Router）
- 使用 React 18 + TypeScript（strict）
- 使用 Tailwind CSS
- 使用 shadcn/ui 组件（Button、Card、Tabs、Dialog、Sheet、Table、Badge、Tooltip、Progress、ScrollArea、Form、Input、Select、Textarea、Toast）
- 使用 lucide-react 图标
- 使用 Recharts 做趋势 sparkline 与风险评级条
- 使用 Zustand 做全局状态
- 数据先用 mock data，不需要真实后端
- AI 追问先用 mock，但要预留 `askWithLLM` 函数（签名见下）
- 基因 txt 解析在浏览器端完成（FileReader + 分块流式读取），原始 SNP 不上传服务器
- 代码结构清晰，方便后续替换静态内容与接入真实 LLM

## 核心页面

1. 数据上传向导 `/onboarding` —— 4 步表单
2. 全景仪表盘 `/dashboard` —— 报告主页
3. 系统详情页 `/system/[id]` —— 每个系统的深度阅读视图
4. 补剂管理页 `/supplements` —— 清单 + 缺口 + 冲突
5. 监测追踪页 `/monitoring` —— 体检指标与目标值对照
6. 历史报告页 `/history` —— 多次分析的版本对比
7. 设置页 `/settings` —— API Key、数据管理、导出

全局组件：

- 左侧 Sidebar
- 顶部 Header
- 右侧 AI 追问抽屉（全局可触发）
- 位点详情抽屉（在系统页 / 仪表盘均可触发）

## 核心用户流程

1. 用户进入首页 `/onboarding`，看到 4 步向导：基础信息 → 基因数据 → HLA → 补剂/体检
2. 步骤一：填写性别、出生年份、地区，可选填 APOE 分型
3. 步骤二：拖拽或选择 WeGene / 23andMe txt 文件，前端流式解析，进度条显示，解析完成后展示"已识别 47 个关键位点 / 共 ~50 个"
4. 步骤三：选择"录入 HLA"或"跳过"，录入采用结构化表单（A / B / C / DRB1 / DQB1 各两列）
5. 步骤四：选择"录入补剂"或"跳过"，可逐条增删，可选体检结果录入
6. 点击"生成报告"，跳转 `/dashboard`
7. 仪表盘顶部为 8 个系统的风险卡片网格（4×2），每个卡片显示：系统名 / 风险等级 / 驱动位点（最多 3 个 chip）/ 一句话结论
8. 仪表盘中部三列：S/A/B 补剂矩阵 / 监测指标列表 / 回避清单
9. 点击系统卡片 → 进入 `/system/[id]` 详情页
10. 系统详情页结构：当前系统的位点表 / 量化影响 / 与其他系统的交叉影响图 / 补剂策略（必须/择形/支持/警惕 四档）/ 监测指标 / 相关阅读链接
11. 点击任意位点 → 打开位点详情抽屉，显示该 rsid 的功能、用户分型、效应注释、相关补剂
12. 任意页面右上"向 AI 追问"按钮 → 打开右侧 AI 抽屉，自动带入当前上下文（系统 / 位点 / 主题）
13. AI 抽屉提供快捷指令 chips：解释机制 / 给出剂量 / 替代方案 / 风险评估 / 监测建议
14. 发送追问 → 调用 `mockAskAboutContext`，根据 context.topic 返回结构化回复
15. 用户可在补剂页查看当前清单与推荐缺口对比，看到"已覆盖 12/15 个 S 级推荐"
16. 用户可在监测页录入体检数值，看到迷你 sparkline 与目标范围对比
17. 用户可在设置页填入 Claude API Key（localStorage），开启真实追问
18. 用户可点击"导出 Markdown"得到完整报告（PDF 按钮先做占位）

## 页面详细布局

### 页面一：数据上传向导 `/onboarding`

整体：居中 max-w-3xl 卡片 + 顶部步骤条（4 步）+ 底部"上一步 / 下一步"按钮。

**步骤 1 - 基础信息**

字段：
- 性别 Select：女性 / 男性
- 出生年份 Input number
- 地区 Select：中国大陆 / 港澳台 / 东亚 / 欧美 / 其他
- APOE 分型 Select（可选）：ε2/ε2、ε2/ε3、ε3/ε3、ε2/ε4、ε3/ε4、ε4/ε4、未知
- 一段说明文字：APOE 可由后续基因文件推断，无需必填

**步骤 2 - 基因数据**

- 拖拽区 + "选择文件"按钮，接受 .txt（提示：WeGene 或 23andMe 格式）
- 文件选中后显示文件名 + 大小（一般 30-600 MB，提示"文件不会上传到服务器，仅在浏览器解析"）
- 进度条 + 当前已识别位点数 / 目标位点数（实时更新）
- 解析完成后显示一张折叠表：已识别位点（rsid / gene / 分型 / 系统）+ 未覆盖的重要位点列表（带说明）
- 如果检测到 rs429358 + rs7412 且 APOE 未填，自动推断分型并提示

**步骤 3 - HLA 分型（可选）**

- 一段说明：HLA 决定免疫识别，对自身免疫/疫苗反应/疾病风险有重要影响
- 表单（每行一个位点）：HLA-A / HLA-B / HLA-C / HLA-DRB1 / HLA-DQB1，每个位点两个 input（allele1 / allele2），格式提示 `A*11:01`
- "跳过此步"按钮

**步骤 4 - 补剂与体检（可选）**

两个 tab：
- Tab 1 补剂：可增删的列表，每条 = 品牌 + 产品名 + 主要成分列表（成分 + 量 + 单位）+ 日剂量
- Tab 2 体检：可增删的列表，每条 = 指标名（Select：Hcy / 25-OH-D / hsCRP / 铁蛋白 / TSH / TPO 抗体 / 空腹血糖 / 胰岛素 / holoTC / MMA / 视黄醇）+ 数值 + 单位 + 测量日期
- "跳过此步"按钮
- "生成报告"按钮

### 页面二：全景仪表盘 `/dashboard`

整体：左侧 Sidebar + 顶部 Header + 中央内容区。

**顶部 Header**：
- 项目标题"我的遗传健康全景"
- 生成时间
- 操作按钮：重新分析 / 导出 Markdown / 导出 PDF（占位）/ 分享（占位）
- 右上角"向 AI 追问"按钮

**内容区第一行 - 总览指标条**：
4 个数字卡片横排：高风险系统数 / 中风险系统数 / S 级推荐补剂数 / 待监测指标数

**内容区第二行 - 系统风险网格（4×2）**：
8 张卡片，每张：
- 顶部色条（按风险等级染色）
- 系统图标（lucide）+ 系统名
- 风险等级 Badge（高/中/低）
- 一句话结论（来自 `SystemAssessment.oneLineSummary`）
- 驱动位点 chip 列表（最多 3 个，多余折叠）
- 右下角"查看详情 →"

8 个系统：
- 神经与脑（Brain 图标）
- 炎症与免疫（Shield 图标）
- 甲基化系统（GitBranch 图标）
- 维生素代谢（Pill 图标）
- 雌激素代谢（Flower 图标）
- 氧化与解毒（Filter 图标）
- 神经递质（Activity 图标）
- 心血管与代谢（Heart 图标）

**内容区第三行 - 三列矩阵**：
- 左列：S/A/B 补剂矩阵（三个折叠 Section，每条：补剂名 + 剂量 + 基因依据 chip）
- 中列：监测指标矩阵（表格：指标 / 目标 / 频率 / 最近值 / 状态 Badge）
- 右列：回避清单（表格：回避项 / 原因 chip）

**内容区底部 - 未覆盖位点提示**：
折叠 Section：列出"重要但本次未检测到的位点"，每条给出说明 + 建议补检渠道。

### 页面三：系统详情页 `/system/[id]`

整体：左 Sidebar + 顶部 Header（含返回 / 系统名 / 风险 Badge）+ 中央两栏（主内容 8 列 + 右侧目录 4 列）+ 全局 AI 抽屉触发。

**主内容自上而下**：

1. **概述卡片**：风险等级 + 驱动逻辑（2-3 句话）+ 关键交叉位点
2. **位点详情表**：表格列 = rsid / gene / variant / 我的分型 / 效应 / 量化影响
3. **机制深读**：Markdown 渲染区（从 `content/systems/[id].mdx` 渲染）
4. **与其他系统的交叉影响**：列表（其他系统名 + 协同/拮抗 Badge + 一句话机制）
5. **补剂策略**：四档手风琴折叠
   - 必须补充（红色边框）
   - 需选对形式（橙色边框）
   - 支持系统（蓝色边框）
   - 需要警惕 / 回避（灰色边框）
   每条：补剂名 / 推荐剂量 / 基因依据 / "和 AI 讨论"按钮
6. **监测指标**：表格 + 用户已有体检值对比
7. **相关阅读**：跳转其他系统的卡片链接

**右侧目录**：sticky，跟随滚动高亮当前节。

### 页面四：补剂管理 `/supplements`

- 顶部：当前补剂数 / 已覆盖 S 级数 / 缺口数 / 冲突数
- 中间：表格列出当前补剂（品牌 + 名称 + 主要成分 + 剂量 + 标签：覆盖了哪些基因/系统）
- 右侧或下方：缺口建议（S/A/B 推荐中尚未覆盖的）
- 冲突警告卡片：如发现"用户清单中有大剂量 α-生育酚"且 APOE4 → 标红警告

### 页面五：监测追踪 `/monitoring`

- 表格列：指标 / 目标范围 / 频率 / 最近值 / 状态 / 历史 sparkline / 操作
- 每行可点开 → 展开历史录入列表 + 新增数值按钮
- 顶部筛选：所有 / 异常 / 正常 / 未录入

### 页面六：历史报告 `/history`

- 卡片列表：每次"生成报告"的快照（时间 / 风险等级变化 / 关键差异）
- 点击 → 进入只读视图

### 页面七：设置 `/settings`

- AI 接入：Claude API Key 输入框（密码型）+ 模型选择（claude-opus-4-7 / claude-sonnet-4-6）+ 测试连接按钮
- 数据管理：导出全部 JSON / 清除全部数据（确认对话框）
- 隐私说明卡片

## 全局组件详细

### 左侧 Sidebar（260px）

- 顶部 Logo "Genome Lens"
- 导航：仪表盘 / 系统详情（折叠列出 8 个）/ 补剂 / 监测 / 历史 / 设置
- 底部：当前用户简要（性别 + APOE）+ "重新上传"链接
- 折叠/展开按钮

### 顶部 Header（48px）

- 面包屑
- 右侧：搜索（占位）/ 通知（占位）/ "向 AI 追问"按钮

### 右侧 AI 抽屉（Sheet 组件，420px）

- 标题：根据 context 动态显示，例 "向 AI 追问 - MTHFR (rs1801133)"
- 上下文卡片：显示当前系统 / 位点 / 我的分型
- 消息列表：用户气泡（slate-100）+ AI 气泡（white + border）
- 快捷指令 chips（点击直接发送）：
  - 解释机制
  - 给出剂量建议
  - 有什么替代方案
  - 评估风险
  - 需要监测什么
- 底部输入框 + 发送按钮
- 设置中未配置 API Key 时显示提示："当前为示例回复，前往设置接入 Claude API 获取个性化追问"

### 位点详情抽屉（Sheet 右侧）

- 标题：基因名 + rsid
- 字段：variant 名 / 系统 / 我的分型 / effectType Badge / 注释段落
- "本位点驱动的推荐"列表
- "查看完整解读"按钮 → 跳系统详情页定位到该位点

## 数据结构

```ts
type SystemId = 'neuro' | 'inflammation' | 'methylation' | 'vitamin' | 'estrogen' | 'detox' | 'neurotransmitter' | 'cardio'
type RiskLevel = 'high' | 'medium' | 'low' | 'unknown'
type Tier = 'S' | 'A' | 'B'

interface BasicInfo { sex: 'female' | 'male'; birthYear: number; region: string; apoe?: string }

interface GenotypedGene {
  rsid: string
  geneSymbol: string
  variantName?: string
  genotype: string
  effectType: 'wild' | 'hetero' | 'homo' | 'unknown'
  system: SystemId
  annotation: string
}

interface HlaRecord { locus: 'A' | 'B' | 'C' | 'DRB1' | 'DQB1'; allele1: string; allele2: string }

interface SupplementItem {
  id: string
  brand: string
  name: string
  ingredients: { name: string; amount: number; unit: 'mg' | 'mcg' | 'g' | 'IU' }[]
  dailyDose?: string
}

interface LabResult {
  id: string
  metric: string
  value: number
  unit: string
  measuredAt: string
  reference?: { low?: number; high?: number; targetLow?: number; targetHigh?: number }
}

interface SystemAssessment {
  systemId: SystemId
  title: string
  riskLevel: RiskLevel
  oneLineSummary: string
  drivingVariants: { rsid: string; reason: string }[]
  crossSystemLinks: { systemId: SystemId; mechanism: string; relation: 'synergy' | 'antagonism' }[]
  narrative: string  // Markdown
}

interface Recommendation {
  id: string
  type: 'supplement' | 'monitor' | 'avoid' | 'behavior'
  tier: Tier
  title: string
  dose?: string
  rationale: { rsid?: string; geneSymbol?: string; mechanism: string }[]
  appliesToSystems: SystemId[]
}

interface MonitoringMetric {
  metric: string
  target: string
  frequency: string
  rationale: string
  userValues?: LabResult[]
  status?: 'in_range' | 'borderline' | 'out_of_range' | 'unknown'
}

interface GenomeReport {
  generatedAt: string
  basic: BasicInfo
  genes: GenotypedGene[]
  hla: HlaRecord[]
  supplements: SupplementItem[]
  labs: LabResult[]
  systems: SystemAssessment[]
  recommendations: Recommendation[]
  avoidList: Recommendation[]
  monitoring: MonitoringMetric[]
  appendix: { uncoveredImportantRsids: { rsid: string; reason: string }[] }
}

interface ChatContext {
  systemId?: SystemId
  geneSymbol?: string
  rsid?: string
  topic?: 'mechanism' | 'dose' | 'alternatives' | 'monitoring' | 'risk'
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  context: ChatContext
}
```

## 解析与 AI 函数签名

```ts
// 基因 txt 解析
async function parseGeneFile(file: File, onProgress: (parsed: number, found: number) => void): Promise<GenotypedGene[]>

// APOE 推断
function inferApoe(rs429358: string, rs7412: string): string | null

// 报告构建（基于静态规则 + 用户数据）
function buildReport(input: { basic: BasicInfo; genes: GenotypedGene[]; hla: HlaRecord[]; supplements: SupplementItem[]; labs: LabResult[] }): GenomeReport

// AI 追问 - mock
async function mockAskAboutContext(question: string, context: ChatContext, report: GenomeReport): Promise<ChatMessage>

// AI 追问 - 真实接口（预留）
async function askWithLLM(question: string, context: ChatContext, report: GenomeReport, apiKey: string): Promise<ChatMessage>
```

`buildReport` 内部用静态规则表（来自 `content/rules.json`）将用户分型映射到风险等级与触发的推荐。MVP 阶段所有规则与系统机制段都用占位 mock 数据。

## Mock 数据要求

请预置以下 mock 数据，模拟一个具有以下特征的女性用户：

- APOE ε3/ε4 杂合
- MTHFR C677T 杂合 + A1298C 纯合（复合杂合）
- COMT GG 高速型
- MAOA GG 高速型
- TCN2 GG（B12 运输受损）
- BCO1 双纯合（β-胡萝卜素转化受损）
- IL-6 GG 高产型
- VDR FokI 杂合
- BDNF Val/Met
- PPARGC1A Ser/Ser
- HLA-B*27:05 + HLA-DRB1*15:01 + HLA-DRB1*04:03（自身免疫高风险背景）

预期生成的系统风险分布：神经/炎症免疫/甲基化/维生素代谢 = 高风险；其余 = 中/低。

请为每个系统、每条 S 级推荐、每条监测指标都填好占位文本，文本可以是 1-2 句话占位（真实内容由后续 `03_内容生成提示词.md` 填充）。

## 视觉细节

- 左侧导航 260px、宽度 64px 折叠态
- 右侧 AI 抽屉 420px
- 主内容 max-w-7xl，水平居中
- 系统卡片：宽度 280px，高度 200px，hover 时阴影加深、向上 2px
- 风险色条：高度 4px，置于卡片顶部
- Badge：rounded-full px-2 py-0.5 text-xs
- 表格：紧凑型，行高 40px，斑马纹关闭，hover 行变 slate-50
- 主按钮：bg-primary（墨绿）text-white
- 次按钮：variant="outline" border-slate-300
- 风险等级 Badge 配色：
  - 高：bg-red-50 text-red-700 border-red-200
  - 中：bg-orange-50 text-orange-700 border-orange-200
  - 低：bg-green-50 text-green-700 border-green-200
  - 未知：bg-slate-100 text-slate-600 border-slate-200
- 字号：标题 text-2xl font-semibold；正文 text-sm leading-relaxed text-slate-700
- 圆角统一 rounded-xl
- 阴影统一 shadow-sm hover:shadow-md

## 交互要求

- 上传 txt 时主线程不可阻塞，使用 Web Worker（或 setTimeout 分块）
- 每步向导有客户端校验，必填项缺失时禁用"下一步"
- 解析过程中显示当前已识别位点数 / 目标位点数
- 解析完成后弹出 Toast："已识别 X 个关键位点"
- 点击系统卡片 → 平滑过渡到详情页（保留滚动恢复）
- 点击位点 chip → 打开位点详情抽屉
- 点击"向 AI 追问" → 打开 AI 抽屉，自动带入上下文
- 快捷指令 chip 点击 → 直接以该指令为问题发送
- 设置页 API Key 输入完成后点击"测试连接"，调用 `askWithLLM` 测试请求，成功显示 Toast
- 重新分析 → 弹确认对话框（保留原数据，仅重建报告）
- 清除全部数据 → 二次确认
- 表格行点击 → 展开/折叠详情或打开抽屉，行为统一
- 所有外链/导出按钮在未实现时显示 Tooltip "即将上线"

## 关键非功能性要求

1. **隐私第一**：基因 txt 文件解析必须只在浏览器内，绝对不发送到服务器；UI 上明确告知
2. **大文件性能**：txt 文件可达 600 MB，使用流式分块解析（每块 ~10 MB），主线程不卡顿
3. **离线可用**：解析与 mock 报告生成完全离线，仅 AI 追问需要联网
4. **可访问性**：键盘可达、Aria 标注、对比度符合 WCAG AA
5. **响应式**：1280+ 桌面优先，平板（≥768px）可降级为单列，手机不强求
6. **免责声明**：仪表盘顶部 + 报告导出文件中都需包含"本工具不构成医疗诊断，请在医生指导下使用"

## 输出要求

请生成完整可运行的 Next.js 14（App Router）项目代码。

代码要包括：

- 完整文件目录结构
- 所有页面组件（路由按 App Router 组织）
- 数据结构 types（在 `types/` 下）
- mock 数据（在 `content/mock/` 下，按上文用户特征填充）
- mock AI 生成函数（在 `lib/mock-llm.ts`）
- 基因 txt 解析器（在 `lib/parser/`，支持 WeGene 格式 + APOE 推断）
- 关键位点字典占位（在 `lib/annotation/key-rsids.ts`，结构完整，可后续从外部 JSON 加载）
- 全局状态 store（Zustand，在 `store/`）
- 样式（Tailwind 配置 + globals.css）
- shadcn/ui 组件引入说明（package.json + components.json）
- README，写明：本地启动命令、如何替换 mock 内容、如何接入真实 Claude API

请优先保证：

1. 页面看起来专业、克制，符合医疗/科研产品调性
2. 数据流从"上传 → 解析 → 报告 → 详情"完全跑通（用 mock 数据）
3. AI 抽屉能在任意页面被触发，并正确传递上下文
4. 函数签名与上文一致，方便后续接入真实 Claude API 和填充真实内容
5. 大文件解析不卡顿
6. 代码可维护、组件可复用、命名清晰

---

## 提示词结束

---

## 后续配套动作

1. 用 `03_内容生成提示词.md` 中的"系统机制段"、"补剂矩阵"、"监测指标"等 prompt，逐个生成 JSON 内容，放到 `content/systems/`、`content/recommendations/`、`content/monitoring/` 目录
2. 用 `03_内容生成提示词.md` 中的"AI 追问"prompt 替换 `lib/mock-llm.ts` 内的占位回复模板
3. 在 `lib/annotation/key-rsids.ts` 填充完整 50+ 位点字典（参考 [Notes/00_遗传全景地图.md](../Notes/00_遗传全景地图.md)）
4. 用本地用户自己的 WeGene txt 验证解析端到端
5. 接入 Claude API（在 `app/api/chat/route.ts` 中代理），把 API Key 从 localStorage 切换到环境变量
