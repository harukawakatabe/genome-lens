"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flower,
  GitBranch,
  Heart,
  History,
  LayoutDashboard,
  Pill,
  Settings,
  Shield,
  Telescope,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SYSTEMS } from "@/types";
import { useApp } from "@/store";

const SYSTEM_ICONS: Record<string, any> = {
  Brain,
  Shield,
  GitBranch,
  Pill,
  Flower,
  Filter,
  Activity,
  Heart,
};

interface NavItemProps {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

function NavItem({ href, icon: Icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10 text-primary font-medium" : "text-slate-700 hover:bg-slate-100",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = React.useState(false);
  const [systemsOpen, setSystemsOpen] = React.useState(true);
  const basic = useApp((s) => s.basic);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-white flex items-center justify-center">
            <Telescope className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900">Genome Lens</span>
              <span className="text-[10px] text-slate-500">基因之镜</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="折叠/展开侧边栏"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="仪表盘" active={pathname === "/dashboard"} collapsed={collapsed} />
        <div>
          <button
            onClick={() => setSystemsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium uppercase text-slate-500 hover:text-slate-700"
          >
            {!collapsed && <span>系统详情</span>}
            {!collapsed && <ChevronRight className={cn("h-3 w-3 transition-transform", systemsOpen && "rotate-90")} />}
          </button>
          {systemsOpen && (
            <div className="space-y-0.5">
              {SYSTEMS.map((s) => {
                const Icon = SYSTEM_ICONS[s.icon] ?? Activity;
                return (
                  <NavItem
                    key={s.id}
                    href={`/system/${s.id}`}
                    icon={Icon}
                    label={s.title}
                    active={pathname === `/system/${s.id}`}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-slate-200 space-y-0.5">
          <NavItem href="/supplements" icon={Pill} label="补剂" active={pathname === "/supplements"} collapsed={collapsed} />
          <NavItem href="/monitoring" icon={Activity} label="监测" active={pathname === "/monitoring"} collapsed={collapsed} />
          <NavItem href="/history" icon={History} label="历史" active={pathname === "/history"} collapsed={collapsed} />
          <NavItem href="/settings" icon={Settings} label="设置" active={pathname === "/settings"} collapsed={collapsed} />
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3 text-xs text-slate-500 space-y-2">
        {!collapsed && basic && (
          <div className="space-y-0.5">
            <div className="text-slate-700">
              {basic.sex === "female" ? "女" : "男"} · {basic.birthYear}
            </div>
            <div>APOE {basic.apoe ?? "—"}</div>
          </div>
        )}
        <Link
          href="/onboarding"
          className="flex items-center gap-1.5 text-primary hover:underline"
        >
          <Upload className="h-3.5 w-3.5" />
          {!collapsed && <span>重新上传</span>}
        </Link>
      </div>
    </aside>
  );
}
