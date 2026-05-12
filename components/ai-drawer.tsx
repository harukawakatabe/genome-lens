"use client";
import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/store";
import { mockAskAboutContext, askWithLLM } from "@/lib/mock-llm";
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
  const { aiOpen, closeAi, aiContext, messages, pushMessage, report, apiKey, model } = useApp((s) => ({
    aiOpen: s.aiOpen,
    closeAi: s.closeAi,
    aiContext: s.aiContext,
    messages: s.messages,
    pushMessage: s.pushMessage,
    report: s.report,
    apiKey: s.apiKey,
    model: s.model,
  }));

  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const viewRef = React.useRef<HTMLDivElement>(null);

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
      const reply = apiKey
        ? await askWithLLM(question, ctx, report, apiKey, model)
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
      <SheetContent side="right" className="p-0">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {titleParts.join(" · ")}
          </SheetTitle>
          <SheetDescription>
            {apiKey ? `已接入 Claude（${model}）` : "当前为示例回复，前往设置接入 Claude API 获取个性化追问。"}
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
