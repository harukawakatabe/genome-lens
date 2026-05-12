"use client";
import * as React from "react";
import { Download, Eye, EyeOff, KeyRound, Link as LinkIcon, Server, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useShallow } from "zustand/react/shallow";
import { useApp } from "@/store";
import { askWithLLM } from "@/lib/mock-llm";
import { toast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/export";

export default function SettingsPage() {
  const {
    apiKey,
    model,
    baseUrl,
    useSystemToken,
    setApiKey,
    setModel,
    setBaseUrl,
    setUseSystemToken,
    resetAll,
    report,
    basic,
    genes,
    hla,
    supplements,
    labs,
  } = useApp(
    useShallow((s) => ({
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.baseUrl,
      useSystemToken: s.useSystemToken,
      setApiKey: s.setApiKey,
      setModel: s.setModel,
      setBaseUrl: s.setBaseUrl,
      setUseSystemToken: s.setUseSystemToken,
      resetAll: s.resetAll,
      report: s.report,
      basic: s.basic,
      genes: s.genes,
      hla: s.hla,
      supplements: s.supplements,
      labs: s.labs,
    })),
  );
  const envKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  const effectiveKey = apiKey || envKey;
  const [draftKey, setDraftKey] = React.useState(apiKey ?? "");
  const [draftModel, setDraftModel] = React.useState(model);
  const [draftBaseUrl, setDraftBaseUrl] = React.useState(baseUrl ?? "");
  const [show, setShow] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => setDraftKey(apiKey ?? ""), [apiKey]);
  React.useEffect(() => setDraftModel(model), [model]);
  React.useEffect(() => setDraftBaseUrl(baseUrl ?? ""), [baseUrl]);

  async function testConnection() {
    const keyToTest = draftKey || envKey;
    if (!keyToTest || !report) return;
    setTesting(true);
    try {
      const reply = await askWithLLM(
        "请用一句话确认连接成功。",
        { topic: "mechanism" },
        report,
        keyToTest,
        draftModel || "claude-opus-4-7",
        draftBaseUrl || undefined,
      );
      if (draftKey) {
        setApiKey(draftKey);
      }
      setModel(draftModel || "claude-opus-4-7");
      setBaseUrl(draftBaseUrl || undefined);
      toast({ title: "连接成功", description: reply.content.slice(0, 60) });
    } catch (e: any) {
      toast({ title: "连接失败", description: e?.message ?? "请检查 API Key / Base URL / 网络" });
    } finally {
      setTesting(false);
    }
  }

  function saveAll() {
    setApiKey(draftKey || undefined);
    setModel(draftModel || "claude-opus-4-7");
    setBaseUrl(draftBaseUrl || undefined);
    toast({ title: "已保存配置" });
  }

  function clearKey() {
    setDraftKey("");
    setApiKey(undefined);
    toast({ title: "已清除 API Key" });
  }

  function exportJson() {
    const payload = JSON.stringify({ basic, genes, hla, supplements, labs, report }, null, 2);
    downloadFile(`genome-lens-data-${Date.now()}.json`, payload, "application/json");
    toast({ title: "已导出 JSON" });
  }

  return (
    <AppShell crumbs={[{ label: "仪表盘", href: "/dashboard" }, { label: "设置" }]}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">设置</h1>
        <p className="mt-1 text-xs text-slate-500">AI 接入 · 数据管理 · 隐私</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> AI 接入
            </CardTitle>
            <CardDescription>填入你的 Claude API Key 即可解锁个性化追问，Key 仅保存在本地 localStorage。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 系统 Token 开关 */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">使用系统内置 Token</p>
                  <p className="text-[11px] text-slate-500">由服务端持有，Key 不暴露给浏览器</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useSystemToken}
                  onChange={(e) => setUseSystemToken(e.target.checked)}
                />
                <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-primary transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
              </label>
            </div>

            <div className={useSystemToken ? "opacity-40 pointer-events-none space-y-1.5" : "space-y-1.5"}>
              <Label>Claude API Key</Label>
              {!apiKey && envKey && (
                <p className="text-[11px] text-emerald-600">已从 .env.local 读取（NEXT_PUBLIC_ANTHROPIC_API_KEY）</p>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={show ? "text" : "password"}
                    placeholder={envKey && !apiKey ? "（已从环境变量读取）" : "sk-ant-..."}
                    value={draftKey}
                    onChange={(e) => setDraftKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setShow((v) => !v)}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={testConnection} disabled={(!draftKey && !envKey) || testing || !report}>
                  {testing ? "测试中…" : "测试连接"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>模型</Label>
                <span className="text-[10px] text-slate-400">支持自由输入</span>
              </div>
              <Input
                list="model-presets"
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                placeholder="claude-opus-4-7"
              />
              <datalist id="model-presets">
                <option value="claude-opus-4-7" />
                <option value="claude-sonnet-4-6" />
                <option value="claude-haiku-4-5-20251001" />
                <option value="claude-3-5-sonnet-latest" />
                <option value="claude-3-5-haiku-latest" />
              </datalist>
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  "claude-opus-4-7",
                  "claude-sonnet-4-6",
                  "claude-haiku-4-5-20251001",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraftModel(m)}
                    className={
                      draftModel === m
                        ? "rounded-full border border-primary bg-primary/10 text-primary text-[10px] px-2 py-0.5"
                        : "rounded-full border border-slate-200 bg-white text-slate-600 text-[10px] px-2 py-0.5 hover:border-slate-300"
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="inline-flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> ANTHROPIC_BASE_URL（可选）
                </Label>
                {baseUrl && <Badge variant="primary">已自定义</Badge>}
              </div>
              <Input
                value={draftBaseUrl}
                onChange={(e) => setDraftBaseUrl(e.target.value)}
                placeholder="https://api.anthropic.com"
              />
              <p className="text-[10px] text-slate-500">
                留空使用官方地址。可填代理 / 中转端点，如 <code className="bg-slate-100 px-1 rounded">https://your-proxy.com</code>。会自动补 <code className="bg-slate-100 px-1 rounded">/v1/messages</code>。
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearKey}>
                清除 Key
              </Button>
              <Button onClick={saveAll}>保存</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据管理</CardTitle>
            <CardDescription>导出 / 清除你的全部本地数据。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={exportJson} className="w-full justify-start">
              <Download className="h-3.5 w-3.5 mr-2" /> 导出全部 JSON
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)} className="w-full justify-start text-red-600 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> 清除全部数据
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> 隐私说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed space-y-2">
            <p>基因原始 txt 文件仅在你的浏览器内解析，**原始 SNP 不会上传到任何服务器**。本地存储使用 <code className="bg-slate-100 px-1 rounded text-xs">localStorage</code>。</p>
            <p>启用 AI 追问后，你的问题以及命中的位点 / 系统评估摘要会随请求发送给 Anthropic Claude，请勿在问题中包含可识别身份的信息。</p>
            <p>本工具仅用于教育与自我管理参考，不构成医疗诊断。</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清除全部数据？</DialogTitle>
            <DialogDescription>将删除已录入的基因 / HLA / 补剂 / 体检与所有历史快照，操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetAll();
                toast({ title: "已清除全部数据" });
                setConfirmOpen(false);
              }}
            >
              确认清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
