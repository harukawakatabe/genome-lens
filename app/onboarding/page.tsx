"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Disclaimer } from "@/components/disclaimer";
import { toast } from "@/components/ui/toast";
import { useApp } from "@/store";
import { parseGeneFile, inferApoe } from "@/lib/parser";
import { buildReport } from "@/lib/report-builder";
import { KEY_RSIDS } from "@/lib/annotation/key-rsids";
import { MOCK_GENES, MOCK_HLA, MOCK_SUPPLEMENTS, MOCK_LABS } from "@/content/mock/user-genes";
import { cn, uid } from "@/lib/utils";
import type { BasicInfo, GenotypedGene, HlaRecord, LabResult, SupplementItem } from "@/types";

const STEPS = ["基础信息", "基因数据", "HLA 分型", "补剂 & 体检"];

const LAB_METRICS = [
  "Hcy",
  "25-OH-D",
  "hsCRP",
  "铁蛋白",
  "TSH",
  "TPO 抗体",
  "空腹血糖",
  "胰岛素",
  "holoTC",
  "MMA",
  "视黄醇",
];

export default function OnboardingPage() {
  const router = useRouter();
  const store = useApp();

  const [step, setStep] = React.useState(0);
  const [basic, setBasic] = React.useState<Partial<BasicInfo>>({ region: "中国大陆" });
  const [genes, setGenes] = React.useState<GenotypedGene[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [fileSize, setFileSize] = React.useState(0);
  const [parsing, setParsing] = React.useState(false);
  const [percent, setPercent] = React.useState(0);
  const [found, setFound] = React.useState(0);
  const [hla, setHla] = React.useState<HlaRecord[]>([
    { locus: "A", allele1: "", allele2: "" },
    { locus: "B", allele1: "", allele2: "" },
    { locus: "C", allele1: "", allele2: "" },
    { locus: "DRB1", allele1: "", allele2: "" },
    { locus: "DQB1", allele1: "", allele2: "" },
  ]);
  const [supplements, setSupplements] = React.useState<SupplementItem[]>([]);
  const [labs, setLabs] = React.useState<LabResult[]>([]);

  const canNext = (() => {
    if (step === 0) return basic.sex && basic.birthYear && basic.region;
    return true;
  })();

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileSize(file.size);
    setParsing(true);
    setPercent(0);
    setFound(0);
    try {
      const list = await parseGeneFile(file, (parsed, foundCount) => {
        const p = Math.min(100, Math.round(((parsed * 4096) / file.size) * 100));
        setPercent(p);
        setFound(foundCount);
      });
      setPercent(100);
      setGenes(list);
      // 推断 APOE
      const a = list.find((g) => g.rsid === "rs429358")?.genotype;
      const b = list.find((g) => g.rsid === "rs7412")?.genotype;
      if (a && b) {
        const apoe = inferApoe(a, b);
        if (apoe && !basic.apoe) setBasic((s) => ({ ...s, apoe }));
      }
      toast({ title: `已识别 ${list.length} 个关键位点`, description: `共关注 ${KEY_RSIDS.length} 个` });
    } catch (e: any) {
      toast({ title: "解析失败", description: e?.message ?? "未知错误" });
    } finally {
      setParsing(false);
    }
  }

  function loadMockGenes() {
    setGenes(MOCK_GENES);
    setFound(MOCK_GENES.length);
    setPercent(100);
    setFileName("mock-sample.txt");
    setFileSize(72_345_678);
    if (!basic.apoe) setBasic((s) => ({ ...s, apoe: "ε3/ε4" }));
    toast({ title: `已加载示例：识别 ${MOCK_GENES.length} 个位点` });
  }

  function loadMockHla() {
    setHla(MOCK_HLA);
    toast({ title: "已加载示例 HLA" });
  }

  function loadMockSuppLabs() {
    setSupplements(MOCK_SUPPLEMENTS);
    setLabs(MOCK_LABS);
    toast({ title: "已加载示例补剂与体检" });
  }

  function generate() {
    const finalBasic: BasicInfo = {
      sex: (basic.sex as "female" | "male") ?? "female",
      birthYear: Number(basic.birthYear) || new Date().getFullYear() - 30,
      region: basic.region ?? "中国大陆",
      apoe: basic.apoe,
    };
    const report = buildReport({
      basic: finalBasic,
      genes: genes.length ? genes : MOCK_GENES,
      hla: hla.filter((h) => h.allele1 || h.allele2),
      supplements,
      labs,
    });
    store.setBasic(finalBasic);
    store.setGenes(report.genes);
    store.setHla(report.hla);
    store.setSupplements(supplements);
    store.setLabs(labs);
    store.setReport(report);
    store.pushSnapshot(report);
    toast({ title: "报告已生成", description: "正在跳转到仪表盘…" });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50/40 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-md bg-primary text-white flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Genome Lens · 基因之镜</h1>
            <p className="text-xs text-slate-500">把你的基因 / HLA / 补剂 / 体检整合为一份多系统全景报告</p>
          </div>
        </div>

        <StepBar step={step} />

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "用于个性化报告与默认值推断。"}
              {step === 1 && "你的基因 txt 仅在浏览器内解析，原始 SNP 不会上传任何服务器。"}
              {step === 2 && "HLA 决定免疫识别，对自身免疫 / 疫苗反应 / 疾病风险有重要影响。"}
              {step === 3 && "可选。录入后可看到补剂矩阵的覆盖与缺口分析。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && (
              <BasicForm value={basic} onChange={setBasic} />
            )}
            {step === 1 && (
              <GeneStep
                fileName={fileName}
                fileSize={fileSize}
                parsing={parsing}
                percent={percent}
                found={found}
                genes={genes}
                onFile={handleFile}
                onMock={loadMockGenes}
              />
            )}
            {step === 2 && <HlaStep value={hla} onChange={setHla} onMock={loadMockHla} />}
            {step === 3 && (
              <SuppLabStep
                supplements={supplements}
                setSupplements={setSupplements}
                labs={labs}
                setLabs={setLabs}
                onMock={loadMockSuppLabs}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> 上一步
          </Button>
          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                下一步 <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button onClick={generate}>
                生成报告 <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <li
            key={s}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs flex items-center gap-2",
              active
                ? "border-primary bg-primary/5 text-primary"
                : done
                  ? "border-slate-200 bg-white text-slate-500"
                  : "border-slate-200 bg-white text-slate-400",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                active
                  ? "bg-primary text-white"
                  : done
                    ? "bg-slate-200 text-slate-600"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {s}
          </li>
        );
      })}
    </ol>
  );
}

function BasicForm({
  value,
  onChange,
}: {
  value: Partial<BasicInfo>;
  onChange: (v: Partial<BasicInfo>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>性别 *</Label>
        <Select
          value={value.sex}
          onValueChange={(v) => onChange({ ...value, sex: v as "female" | "male" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">女性</SelectItem>
            <SelectItem value="male">男性</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>出生年份 *</Label>
        <Input
          type="number"
          min={1900}
          max={2026}
          value={value.birthYear ?? ""}
          onChange={(e) => onChange({ ...value, birthYear: Number(e.target.value) })}
          placeholder="例如 1992"
        />
      </div>
      <div className="space-y-1.5">
        <Label>地区 *</Label>
        <Select value={value.region} onValueChange={(v) => onChange({ ...value, region: v })}>
          <SelectTrigger>
            <SelectValue placeholder="选择" />
          </SelectTrigger>
          <SelectContent>
            {["中国大陆", "港澳台", "东亚", "欧美", "其他"].map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>APOE 分型（可选）</Label>
        <Select value={value.apoe} onValueChange={(v) => onChange({ ...value, apoe: v })}>
          <SelectTrigger>
            <SelectValue placeholder="可由基因文件自动推断" />
          </SelectTrigger>
          <SelectContent>
            {["ε2/ε2", "ε2/ε3", "ε3/ε3", "ε2/ε4", "ε3/ε4", "ε4/ε4", "未知"].map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-slate-500">APOE 可由后续基因文件推断，无需必填。</p>
      </div>
    </div>
  );
}

function GeneStep({
  fileName,
  fileSize,
  parsing,
  percent,
  found,
  genes,
  onFile,
  onMock,
}: {
  fileName: string;
  fileSize: number;
  parsing: boolean;
  percent: number;
  found: number;
  genes: GenotypedGene[];
  onFile: (f: File) => void;
  onMock: () => void;
}) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const totalKey = KEY_RSIDS.length;
  const uncovered = KEY_RSIDS.filter((r) => !genes.find((g) => g.rsid === r.rsid));

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          drag ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50/40",
        )}
      >
        <Upload className="mx-auto h-7 w-7 text-slate-400" />
        <p className="mt-2 text-sm text-slate-700">将 WeGene / 23andMe 的 raw txt 拖到这里</p>
        <p className="text-xs text-slate-500">或</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            选择文件
          </Button>
          <Button variant="ghost" size="sm" onClick={onMock}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> 使用示例数据
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3 w-3" />
          文件不会上传到服务器，仅在浏览器内解析。
        </p>
      </div>

      {fileName && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-700">
              {fileName} <span className="text-xs text-slate-400">{(fileSize / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="text-xs text-slate-500">
              已识别 <span className="font-semibold text-slate-800">{found}</span> / {totalKey}
            </div>
          </div>
          <Progress value={percent} className="mt-3" />
          {parsing && (
            <p className="mt-2 inline-flex items-center text-xs text-slate-500">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 正在分块解析…
            </p>
          )}
        </div>
      )}

      {genes.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white" open>
          <summary className="cursor-pointer px-3 py-2 text-sm text-slate-700">已识别位点（{genes.length}）</summary>
          <div className="max-h-72 overflow-auto border-t border-slate-100 p-2 text-xs">
            <table className="w-full">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1">rsid</th>
                  <th className="text-left px-2 py-1">gene</th>
                  <th className="text-left px-2 py-1">分型</th>
                  <th className="text-left px-2 py-1">系统</th>
                </tr>
              </thead>
              <tbody>
                {genes.map((g) => (
                  <tr key={g.rsid} className="border-t border-slate-100">
                    <td className="px-2 py-1 font-mono">{g.rsid}</td>
                    <td className="px-2 py-1">{g.geneSymbol}</td>
                    <td className="px-2 py-1">{g.genotype}</td>
                    <td className="px-2 py-1 text-slate-500">{g.system}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {genes.length > 0 && uncovered.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-sm text-slate-700">
            未覆盖的重要位点（{uncovered.length}）
          </summary>
          <ul className="border-t border-slate-100 p-3 text-xs text-slate-600 space-y-1.5">
            {uncovered.map((r) => (
              <li key={r.rsid}>
                <span className="font-mono">{r.rsid}</span> · {r.geneSymbol} —— {r.annotation}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function HlaStep({
  value,
  onChange,
  onMock,
}: {
  value: HlaRecord[];
  onChange: (v: HlaRecord[]) => void;
  onMock: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onMock}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> 使用示例 HLA
        </Button>
      </div>
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={row.locus} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
            <div className="text-sm font-medium text-slate-700">HLA-{row.locus}</div>
            <Input
              placeholder="例如 A*11:01"
              value={row.allele1}
              onChange={(e) => {
                const copy = [...value];
                copy[i] = { ...row, allele1: e.target.value };
                onChange(copy);
              }}
            />
            <Input
              placeholder="例如 A*02:01"
              value={row.allele2}
              onChange={(e) => {
                const copy = [...value];
                copy[i] = { ...row, allele2: e.target.value };
                onChange(copy);
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">可全部留空，跳过此步。</p>
    </div>
  );
}

function SuppLabStep({
  supplements,
  setSupplements,
  labs,
  setLabs,
  onMock,
}: {
  supplements: SupplementItem[];
  setSupplements: (v: SupplementItem[]) => void;
  labs: LabResult[];
  setLabs: (v: LabResult[]) => void;
  onMock: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onMock}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> 使用示例补剂/体检
        </Button>
      </div>
      <Tabs defaultValue="supp">
        <TabsList>
          <TabsTrigger value="supp">补剂</TabsTrigger>
          <TabsTrigger value="lab">体检</TabsTrigger>
        </TabsList>
        <TabsContent value="supp" className="space-y-3">
          {supplements.map((s, i) => (
            <div key={s.id} className="rounded-lg border border-slate-200 p-3 grid grid-cols-[1fr_1fr_2fr_1fr_auto] gap-2 items-center">
              <Input
                placeholder="品牌"
                value={s.brand}
                onChange={(e) => {
                  const copy = [...supplements];
                  copy[i] = { ...s, brand: e.target.value };
                  setSupplements(copy);
                }}
              />
              <Input
                placeholder="产品名"
                value={s.name}
                onChange={(e) => {
                  const copy = [...supplements];
                  copy[i] = { ...s, name: e.target.value };
                  setSupplements(copy);
                }}
              />
              <Input
                placeholder="主要成分（5-MTHF 1000mcg, 甲钴胺 500mcg）"
                value={s.ingredients.map((x) => `${x.name} ${x.amount}${x.unit}`).join(", ")}
                onChange={(e) => {
                  const copy = [...supplements];
                  const parts = e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((x) => {
                      const m = x.match(/^(.+?)\s*([\d.]+)\s*(mg|mcg|g|IU)?$/i);
                      if (!m) return { name: x, amount: 0, unit: "mg" as const };
                      return { name: m[1], amount: Number(m[2]) || 0, unit: ((m[3] ?? "mg") as any) };
                    });
                  copy[i] = { ...s, ingredients: parts };
                  setSupplements(copy);
                }}
              />
              <Input
                placeholder="每日剂量"
                value={s.dailyDose ?? ""}
                onChange={(e) => {
                  const copy = [...supplements];
                  copy[i] = { ...s, dailyDose: e.target.value };
                  setSupplements(copy);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSupplements(supplements.filter((x) => x.id !== s.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSupplements([
                ...supplements,
                { id: uid("supp"), brand: "", name: "", ingredients: [] },
              ])
            }
          >
            + 添加补剂
          </Button>
        </TabsContent>
        <TabsContent value="lab" className="space-y-3">
          {labs.map((l, i) => (
            <div key={l.id} className="rounded-lg border border-slate-200 p-3 grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <Select
                value={l.metric}
                onValueChange={(v) => {
                  const copy = [...labs];
                  copy[i] = { ...l, metric: v };
                  setLabs(copy);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="指标" />
                </SelectTrigger>
                <SelectContent>
                  {LAB_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="数值"
                value={Number.isFinite(l.value) ? l.value : ""}
                onChange={(e) => {
                  const copy = [...labs];
                  copy[i] = { ...l, value: Number(e.target.value) };
                  setLabs(copy);
                }}
              />
              <Input
                placeholder="单位"
                value={l.unit}
                onChange={(e) => {
                  const copy = [...labs];
                  copy[i] = { ...l, unit: e.target.value };
                  setLabs(copy);
                }}
              />
              <Input
                type="date"
                value={l.measuredAt}
                onChange={(e) => {
                  const copy = [...labs];
                  copy[i] = { ...l, measuredAt: e.target.value };
                  setLabs(copy);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLabs(labs.filter((x) => x.id !== l.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLabs([
                ...labs,
                {
                  id: uid("lab"),
                  metric: "Hcy",
                  value: 0,
                  unit: "μmol/L",
                  measuredAt: new Date().toISOString().slice(0, 10),
                },
              ])
            }
          >
            + 添加体检
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
