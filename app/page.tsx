"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/store";

export default function Home() {
  const router = useRouter();
  const initialized = useApp((s) => s.initialized);

  useEffect(() => {
    router.replace(initialized ? "/dashboard" : "/onboarding");
  }, [initialized, router]);

  return (
    <div className="flex h-screen items-center justify-center text-sm text-slate-500">
      正在打开 Genome Lens…
    </div>
  );
}
