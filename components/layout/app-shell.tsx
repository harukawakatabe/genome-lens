"use client";
import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AiDrawer } from "@/components/ai-drawer";
import { LocusDrawer } from "@/components/locus-drawer";

interface AppShellProps {
  children: React.ReactNode;
  crumbs?: { href?: string; label: string }[];
  fluid?: boolean;
}

export function AppShell({ children, crumbs, fluid }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-700">
      <Sidebar />
      <div className="pl-[260px]">
        <Header crumbs={crumbs} />
        <main className={fluid ? "p-6" : "mx-auto max-w-7xl p-6"}>{children}</main>
      </div>
      <AiDrawer />
      <LocusDrawer />
    </div>
  );
}
