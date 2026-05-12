import { AlertCircle } from "lucide-react";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      className={
        "flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 " +
        (className ?? "")
      }
    >
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>本工具仅用于教育与自我管理参考，不构成医疗诊断，请在医生指导下使用。</span>
    </div>
  );
}
