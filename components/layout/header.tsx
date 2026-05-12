"use client";
import * as React from "react";
import Link from "next/link";
import { Bell, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store";

interface Crumb {
  href?: string;
  label: string;
}

export function Header({ crumbs }: { crumbs?: Crumb[] }) {
  const openAi = useApp((s) => s.openAi);
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur px-6">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="面包屑">
        {(crumbs ?? [{ label: "仪表盘", href: "/dashboard" }]).map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-300">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-slate-900">
                {c.label}
              </Link>
            ) : (
              <span className="text-slate-900">{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="搜索（即将上线）"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="通知（即将上线）"
        >
          <Bell className="h-4 w-4" />
        </button>
        <Button size="sm" variant="outline" onClick={() => openAi()} className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          向 AI 追问
        </Button>
      </div>
    </header>
  );
}
