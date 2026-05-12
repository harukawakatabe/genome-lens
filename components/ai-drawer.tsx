"use client";
import * as React from "react";
import { ChevronDown, Copy, FileCode, Send, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShallow } from "zustand/react/shallow";
import { useApp } from "@/store";
import { mockAskAboutContext, askWithLLM, askViaProxy, buildSystemPrompt, buildUserPrompt } from "@/lib/mock-llm";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { uid } from "@/lib/utils";
import { SYSTEMS, type ChatTopic } from "@/types";

const QUICK_PROMPTS: { topic: ChatTopic; label: string; text: string }[] = [
  { topic: "mechanism", label: "解释机制", text: "请详细解释这一位点 / 系统的机制。" },
  { topic: "dose", label: "给出剂量", text: "结合我的分型给出剂量建议。" },
  { topic: "alternatives", label: "替代方案", text: "如果不接受上述补剂，有哪些替代方案？" },
  { topic: "risk", label: "评估风险", text: "请基于我的整体数据评估这部分风险。" },
  { topic: "monitoring", label: "监测建议", text: "需要监测哪些指标，多久一次？" },
];

export function AiDrawer() {
  const { aiOpen, closeAi, aiContext, messages, pushMessage, report, apiKey, model, baseUrl, useSystemToken } = useApp(
    useShallow((s) => ({
      aiOpen: s.aiOpen,
      closeAi: s.closeAi,
      aiContext: s.aiContext,
      messages: s.messages,
      pushMessage: s.pushMessage,
      report: s.report,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.baseUrl,
      useSystemToken: s.useSystemToken,
    })),
  );
  const effectiveKey = apiKey || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [promptOpen, setPromptOpen] = React.useState(false);
  const [draftQuestion, setDraftQuestion] = React.useState("（你的问题）");
  const [drawerWidth, setDrawerWidth] = React.useState<number>(420);
  const viewRef = React.useRef<HTMLDivElement>(null);
  const resizingRef = React.useRef<{ startX: number; startW: number } | null>(null);

  // 抽屉宽度持久化
  React.useEffect(() => {
    const saved = Number(localStorage.getItem("gl-ai-drawer-width"));
    if (saved && saved >= 360 && saved <= 1600) setDrawerWidth(saved);
  }, []);

  const onResizeMove = React.useCallback((e: PointerEvent) => {
    const r = resizingRef.current;
    if (!r) return;
    const dx = r.startX - e.clientX; // 向左拖 → dx 为正 → 抽屉变宽
    const max = Math.min(typeof window === "undefined" ? 1200 : window.innerWidth - 200, 1400);
    const w = Math.min(Math.max(r.startW + dx, 360), max);
    setDrawerWidth(w);
  }, []);

  const onResizeEnd = React.useCallback(() => {
    if (!resizingRef.current) return;
    resizingRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeEnd);
    try {
      // 用最后一次的 drawerWidth 值持久化
      localStorage.setItem("gl-ai-drawer-width", String(Math.round(drawerWidthRef.current)));
    } catch {
      /* localStorage 不可用时静默 */
    }
  }, [onResizeMove]);

  const drawerWidthRef = React.useRef(drawerWidth);
  React.useEffect(() => {
    drawerWidthRef.current = drawerWidth;
  }, [drawerWidth]);

  function onResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    resizingRef.current = { startX: e.clientX, startW: drawerWidth };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeEnd);
  }

  function onResizeDouble() {
    setDrawerWidth(420);
    try {
      localStorage.removeItem("gl-ai-drawer-width");
    } catch {
      /* ignore */
    }
  }

  // 当输入框 / 上下文 / topic 变化时，重算预览用的问题占位
  React.useEffect(() => {
    setDraftQuestion(input.trim() || "（你的问题）");
  }, [input]);

  const previewSystemPrompt = report ? buildSystemPrompt(report, aiContext) : "";
  const previewUserPrompt = report
    ? buildUserPrompt(draftQuestion, aiContext, report)
    : "";

  const titleParts: string[] = ["向 AI 追问"];
  if (aiContext.systemId) {
    const sys = SYSTEMS.find((s) => s.id === aiContext.systemId);
    if (sys) titleParts.push(sys.title);
  }
  if (aiContext.geneSymbol) titleParts.push(`${aiContext.geneSymbol}${aiContext.rsid ? ` (${aiContext.rsid})` : ""}`);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.scrollTo({ top: viewRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, aiOpen]);

  async function send(question: string, topic?: ChatTopic) {
    if (!report || !question.trim() || sending) return;
    setSending(true);
    const ctx = { ...aiContext, topic: topic ?? aiContext.topic };
    pushMessage({
      id: uid("msg"),
      role: "user",
      content: question.trim(),
      timestamp: new Date().toISOString(),
      context: ctx,
    });
    setInput("");
    try {
      const reply = useSystemToken
        ? await askViaProxy(question, ctx, report, model, baseUrl)
        : effectiveKey
          ? await askWithLLM(question, ctx, report, effectiveKey, model, baseUrl)
          : await mockAskAboutContext(question, ctx, report);
      pushMessage(reply);
    } catch (e: any) {
      toast({ title: "AI 请求失败", description: e?.message ?? "未知错误" });
      // 失败时回退到 mock
      const reply = await mockAskAboutContext(question, ctx, report);
      pushMessage(reply);
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={aiOpen} onOpenChange={(o) => !o && closeAi()}>
      <SheetContent
        side="right"
        className="p-0"
        style={{ width: drawerWidth, maxWidth: "95vw" }}
      >
        {/* 左侧拖拽把手：按住向左拖宽，双击恢复默认 */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整抽屉宽度"
          onPointerDown={onResizeStart}
          onDoubleClick={onResizeDouble}
          title="拖动调整宽度 · 双击恢复"
          className="absolute left-0 top-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize group z-10"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-1 rounded-full bg-slate-200 group-hover:bg-primary transition-colors" />
        </div>
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {titleParts.join(" · ")}
          </SheetTitle>
          <SheetDescription>
            {useSystemToken
            ? `已接入 Claude（系统 Token · ${model}）`
            : effectiveKey
              ? `已接入 Claude（${model}）`
              : "当前为示例回复，前往设置接入 Claude API 获取个性化追问。"}
          </SheetDescription>
          {(aiContext.systemId || aiContext.rsid || aiContext.geneSymbol) && (
            <div className="flex flex-wrap gap-1 pt-1.5">
              {aiContext.systemId && (
                <Badge variant="primary">{SYSTEMS.find((x) => x.id === aiContext.systemId)?.title}</Badge>
              )}
              {aiContext.geneSymbol && <Badge variant="outline">{aiContext.geneSymbol}</Badge>}
              {aiContext.rsid && <Badge variant="outline">{aiContext.rsid}</Badge>}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {report && (
            <div className="border-b border-slate-200 bg-slate-50/40">
              <button
                type="button"
                onClick={() => setPromptOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-slate-500 hover:bg-slate-100/60"
                aria-expanded={promptOpen}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileCode className="h-3 w-3 text-slate-400" />
                  当前上下文
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-slate-400 transition-transform",
                    promptOpen && "rotate-180",
                  )}
                />
              </button>
              {promptOpen && (
                <div className="px-4 pb-3 space-y-2">
                  <PromptBlock label="角色与原则" content={previewSystemPrompt} />
                  <PromptBlock label="本轮提问" content={previewUserPrompt} />
                </div>
              )}
            </div>
          )}

          <div ref={viewRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-xs text-slate-400 mt-12">
                先选一个快捷指令，或输入你的问题。
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-slate-100 p-3 text-sm text-slate-800"
                    : "mr-auto max-w-[90%] rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm"
                }
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
              </div>
            ))}
            {sending && (
              <div className="mr-auto max-w-[80%] rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-400 shadow-sm">
                正在思考…
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.topic}
                  onClick={() => send(q.text, q.topic)}
                  disabled={sending}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：MTHFR 复合杂合下，怎么选叶酸的剂量？"
                className="min-h-[64px] text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <Button
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                size="icon"
                aria-label="发送"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              快捷键 Cmd/Ctrl + Enter 发送 · 此工具不构成医疗诊断。
            </p>
          </div>
        </div>
        <SheetFooter className="hidden" />
      </SheetContent>
    </Sheet>
  );
}

function PromptBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 复制失败静默 */
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="rounded px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600">{label}</span>
          <span className="text-[10px] text-slate-400">{content.length} 字符</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Copy className="h-3 w-3" />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="max-h-44 overflow-auto p-2.5 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">
        {content}
      </pre>
    </div>
  );
}
