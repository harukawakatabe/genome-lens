"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BasicInfo,
  ChatContext,
  ChatMessage,
  GenomeReport,
  GenotypedGene,
  HlaRecord,
  LabResult,
  SupplementItem,
} from "@/types";
import { MOCK_REPORT } from "@/content/mock/report";

interface ReportSnapshot {
  id: string;
  generatedAt: string;
  riskSummary: { systemId: string; risk: string }[];
  report: GenomeReport;
}

interface AppState {
  /** 是否完成首次导入（用于路由守卫） */
  initialized: boolean;
  basic?: BasicInfo;
  genes: GenotypedGene[];
  hla: HlaRecord[];
  supplements: SupplementItem[];
  labs: LabResult[];
  report?: GenomeReport;
  history: ReportSnapshot[];

  /** AI 抽屉 */
  aiOpen: boolean;
  aiContext: ChatContext;
  messages: ChatMessage[];

  /** 位点抽屉 */
  locusOpen: boolean;
  locusRsid?: string;

  /** 设置 */
  apiKey?: string;
  model: string;
  baseUrl?: string;
  useSystemToken: boolean;

  // actions
  setBasic: (b: BasicInfo) => void;
  setGenes: (g: GenotypedGene[]) => void;
  setHla: (h: HlaRecord[]) => void;
  setSupplements: (s: SupplementItem[]) => void;
  addSupplement: (s: SupplementItem) => void;
  removeSupplement: (id: string) => void;
  setLabs: (l: LabResult[]) => void;
  addLab: (l: LabResult) => void;
  removeLab: (id: string) => void;
  setReport: (r: GenomeReport) => void;
  pushSnapshot: (r: GenomeReport) => void;
  loadMock: () => void;
  resetAll: () => void;

  openAi: (ctx?: ChatContext) => void;
  closeAi: () => void;
  pushMessage: (m: ChatMessage) => void;
  clearMessages: () => void;

  openLocus: (rsid: string) => void;
  closeLocus: () => void;

  setApiKey: (k?: string) => void;
  setModel: (m: string) => void;
  setBaseUrl: (u?: string) => void;
  setUseSystemToken: (v: boolean) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      initialized: false,
      basic: undefined,
      genes: [],
      hla: [],
      supplements: [],
      labs: [],
      report: undefined,
      history: [],
      aiOpen: false,
      aiContext: {},
      messages: [],
      locusOpen: false,
      locusRsid: undefined,
      apiKey: undefined,
      model: process.env.NEXT_PUBLIC_ANTHROPIC_MODEL ?? "claude-opus-4-7",
      baseUrl: undefined,
      useSystemToken: false,

      setBasic: (b) => set({ basic: b }),
      setGenes: (g) => set({ genes: g }),
      setHla: (h) => set({ hla: h }),
      setSupplements: (s) => set({ supplements: s }),
      addSupplement: (s) => set({ supplements: [...get().supplements, s] }),
      removeSupplement: (id) => set({ supplements: get().supplements.filter((x) => x.id !== id) }),
      setLabs: (l) => set({ labs: l }),
      addLab: (l) => set({ labs: [...get().labs, l] }),
      removeLab: (id) => set({ labs: get().labs.filter((x) => x.id !== id) }),
      setReport: (r) => set({ report: r, initialized: true }),
      pushSnapshot: (r) =>
        set({
          history: [
            {
              id: `snap_${Date.now()}`,
              generatedAt: r.generatedAt,
              riskSummary: r.systems.map((s) => ({ systemId: s.systemId, risk: s.riskLevel })),
              report: r,
            },
            ...get().history,
          ].slice(0, 20),
        }),
      loadMock: () => {
        const r = MOCK_REPORT;
        set({
          initialized: true,
          basic: r.basic,
          genes: r.genes,
          hla: r.hla,
          supplements: r.supplements,
          labs: r.labs,
          report: r,
          history: [
            {
              id: `snap_${Date.now()}`,
              generatedAt: r.generatedAt,
              riskSummary: r.systems.map((s) => ({ systemId: s.systemId, risk: s.riskLevel })),
              report: r,
            },
          ],
        });
      },
      resetAll: () =>
        set({
          initialized: false,
          basic: undefined,
          genes: [],
          hla: [],
          supplements: [],
          labs: [],
          report: undefined,
          history: [],
          messages: [],
          aiOpen: false,
          locusOpen: false,
          locusRsid: undefined,
        }),

      openAi: (ctx) => set({ aiOpen: true, aiContext: ctx ?? get().aiContext ?? {} }),
      closeAi: () => set({ aiOpen: false }),
      pushMessage: (m) => set({ messages: [...get().messages, m] }),
      clearMessages: () => set({ messages: [] }),

      openLocus: (rsid) => set({ locusOpen: true, locusRsid: rsid }),
      closeLocus: () => set({ locusOpen: false }),

      setApiKey: (k) => set({ apiKey: k }),
      setModel: (m) => set({ model: m }),
      setBaseUrl: (u) => set({ baseUrl: u }),
      setUseSystemToken: (v) => set({ useSystemToken: v }),
    }),
    {
      name: "genome-lens-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        initialized: s.initialized,
        basic: s.basic,
        genes: s.genes,
        hla: s.hla,
        supplements: s.supplements,
        labs: s.labs,
        report: s.report,
        history: s.history,
        apiKey: s.apiKey,
        model: s.model,
        baseUrl: s.baseUrl,
        useSystemToken: s.useSystemToken,
      }),
    },
  ),
);
