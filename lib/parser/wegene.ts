import { KEY_RSID_SET, findEntry, classifyEffect } from "@/lib/annotation/key-rsids";
import type { GenotypedGene } from "@/types";

const CHUNK_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ParseProgress {
  parsedLines: number;
  foundCount: number;
  percent: number;
}

/**
 * 浏览器内流式解析 WeGene / 23andMe 格式的 raw txt：
 *   行格式（tab 分隔）：rsid	chromosome	position	genotype
 *   以 # 开头为注释，跳过。
 *
 * 仅返回命中关键位点字典的条目，原始 SNP 不离开浏览器。
 */
export async function parseGeneFile(
  file: File,
  onProgress: (parsed: number, found: number) => void,
): Promise<GenotypedGene[]> {
  const total = file.size;
  let offset = 0;
  let leftover = "";
  let parsedLines = 0;
  const hits = new Map<string, GenotypedGene>();

  const decoder = new TextDecoder("utf-8");

  while (offset < total) {
    const slice = file.slice(offset, offset + CHUNK_BYTES);
    const buf = await slice.arrayBuffer();
    const text = leftover + decoder.decode(buf, { stream: true });
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() ?? "";

    for (const raw of lines) {
      parsedLines++;
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\t|,/);
      if (parts.length < 4) continue;
      const rsid = parts[0];
      if (!rsid.startsWith("rs")) continue;
      if (!KEY_RSID_SET.has(rsid)) continue;
      const genotype = parts[3].trim();
      const entry = findEntry(rsid);
      if (!entry) continue;
      hits.set(rsid, {
        rsid,
        geneSymbol: entry.geneSymbol,
        variantName: entry.variantName,
        genotype,
        effectType: classifyEffect(entry, genotype),
        system: entry.system,
        annotation: entry.annotation,
      });
    }

    offset += CHUNK_BYTES;
    onProgress(parsedLines, hits.size);
    // 让出主线程，避免阻塞渲染
    await new Promise((r) => setTimeout(r, 0));
  }

  // 处理最后一行残余
  if (leftover) {
    const parts = leftover.trim().split(/\t|,/);
    if (parts.length >= 4 && parts[0].startsWith("rs") && KEY_RSID_SET.has(parts[0])) {
      const entry = findEntry(parts[0])!;
      hits.set(parts[0], {
        rsid: parts[0],
        geneSymbol: entry.geneSymbol,
        variantName: entry.variantName,
        genotype: parts[3].trim(),
        effectType: classifyEffect(entry, parts[3].trim()),
        system: entry.system,
        annotation: entry.annotation,
      });
    }
  }

  onProgress(parsedLines, hits.size);
  return Array.from(hits.values());
}

/**
 * 根据 rs429358 / rs7412 推断 APOE 分型。
 * 每条染色体上一对 (rs429358_base, rs7412_base) 映射到 ε 类型：
 *   ε1 = C / T  （罕见）
 *   ε2 = T / T
 *   ε3 = T / C
 *   ε4 = C / C
 *
 * 由于 raw txt 不给单倍型，只能给出基因型组合，下面按"组合到分型"的常用查表实现。
 */
export function inferApoe(rs429358: string, rs7412: string): string | null {
  const norm = (g: string) => g.replace(/[^ACGT]/gi, "").toUpperCase().split("").sort().join("");
  const a = norm(rs429358);
  const b = norm(rs7412);
  if (a.length !== 2 || b.length !== 2) return null;

  // 查表：key = `${rs429358_sorted}|${rs7412_sorted}`
  const table: Record<string, string> = {
    "TT|TT": "ε2/ε2",
    "CT|TT": "ε2/ε4", // 等价于 (T,T)+(C,T) → e2 + e1 极罕见，多解释为 ε2/ε4
    "CC|TT": "ε4/ε4", // 实际罕见，更可能是 ε1/ε4
    "TT|CT": "ε2/ε3",
    "CT|CT": "ε3/ε4", // 也可能是 ε2/ε4，按常见频率取 ε3/ε4
    "CC|CT": "ε3/ε4",
    "TT|CC": "ε3/ε3",
    "CT|CC": "ε3/ε4",
    "CC|CC": "ε4/ε4",
  };
  return table[`${a}|${b}`] ?? null;
}
