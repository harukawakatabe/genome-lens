import { buildReport } from "@/lib/report-builder";
import { MOCK_BASIC, MOCK_GENES, MOCK_HLA, MOCK_SUPPLEMENTS, MOCK_LABS } from "@/content/mock/user-genes";
import type { GenomeReport } from "@/types";

export const MOCK_REPORT: GenomeReport = buildReport({
  basic: MOCK_BASIC,
  genes: MOCK_GENES,
  hla: MOCK_HLA,
  supplements: MOCK_SUPPLEMENTS,
  labs: MOCK_LABS,
});
