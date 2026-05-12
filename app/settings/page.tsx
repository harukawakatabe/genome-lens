"use client";
import * as React from "react";
import { Download, Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/store";
import { askWithLLM } from "@/lib/mock-llm";
import { toast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/export";

export default function SettingsPage() {
  const { apiKey, model, setApiKey, setModel, resetAll, report, basic, genes, hla, supplements, labs } = useApp((s) => ({
    apiKey: s.apiKey,
    model: s.model,
    setApiKey: s.setApiKey,
    setModel: s.setModel,
    resetAll: s.resetAll,
    report: s.report,
    basic: s.basic,
    genes: s.genes,
    hla: s.hla,
    supplements: s.supplements,
    labs: s.labs,
  }));
  const [draftKey, setDraftKey] = React.useState(apiKey ?? "");
  const [show, setShow] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function testConnection() {
    if (!draftKey || !report) return;
    setTesting(true);
    try {
      const reply = await askWithLLM(
        "请用一句话确认连接成功。",
        { topic: "mechanism" },
        report,
        draftKey,
        model,
      );
      setApiKey(draftKey);
      toast({ title: "连接成功", description: reply.content.slice(0, 60) });
    } catch (e: any) {
      toast({ title: "连接失败", description: e?.message ?? "请检查 API Key 与网络" });
    } finally {
      setTesting(false);
    }
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
            <div className="space-y-1.5">
              <Label>Claude API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={show ? "text" : "password"}
                    placeholder="sk-ant-..."
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
                <Button onClick={testConnection} disabled={!draftKey || testing}>
                  {testing ? "测试中…" : "测试连接"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-opus-4-7">claude-opus-4-7</SelectItem>
                  <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDraftKey(""); setApiKey(undefined); toast({ title: "已清除 API Key" }); }}>
                清除
              </Button>
              <Button onClick={() => { setApiKey(draftKey || undefined); toast({ title: "已保存 API Key" }); }}>
                保存
              </Button>
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
