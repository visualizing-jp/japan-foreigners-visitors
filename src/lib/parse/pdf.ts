/**
 * PDF しかない2表を `pdftotext -layout` の出力から読む。
 *
 * - 年別 訪日外客数・出国日本人数: 1行1年。人数は必ず桁区切りがあるので、それだけを拾う。
 * - 国籍/目的別 訪日外客数: 1ページ1年。行頭の字下げが階層（州・国・内訳）を表す。
 *   人数と伸率が交互に並ぶが、伸率が抜けるページ（2007年の観光客）がある。
 *   伸率は必ず小数点か記号（*****・‐）を含むので、小数点のない整数だけを人数とする。
 */

import { execFileSync } from "node:child_process";
import { TOTAL, cleanName, regionName } from "./names.ts";
import type { AnnualRow, Level, PurposeRow, PurposeYear } from "./types.ts";

function pages(path: string): string[][] {
  return execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8", maxBuffer: 64 << 20 })
    .split("\f")
    .map((p) => p.split("\n"));
}

const COUNT = /^\d{1,3}(?:,\d{3})*$/;
const GROUPED = /^\d{1,3}(?:,\d{3})+$/;
const int = (s: string) => Number(s.replace(/,/g, ""));

export function parseAnnual(path: string): AnnualRow[] {
  const out: AnnualRow[] = [];
  for (const line of pages(path).flat()) {
    const m = line.match(/^\s*(\d{4})\s/);
    if (m === null) continue;
    const counts = line.trim().split(/\s+/).filter((t) => GROUPED.test(t));
    if (counts.length !== 2) throw new Error(`年別 ${m[1]}: 人数が2つでない「${line.trim()}」`);
    out.push({ year: Number(m[1]), visitors: int(counts[0]!), outbound: int(counts[1]!) });
  }
  return out;
}

const CATEGORY = /観光客|商用客|その他客|一時上陸客/g;

function parsePurposePage(lines: string[]): PurposeYear | null {
  const title = lines.find((l) => /\d{4}年\s*国籍別\s*\/\s*目的別/.test(l));
  if (title === undefined) return null;
  const year = Number(title.match(/(\d{4})年/)![1]);
  const header = lines.find((l) => l.includes("総数") && l.includes("観光客"));
  if (header === undefined) throw new Error(`目的別 ${year}: 見出しがない`);
  const categories = header.match(CATEGORY) ?? [];

  const rows: PurposeRow[] = [];
  let region: string | null = null;
  let market: string | null = null;
  for (const line of lines) {
    if (line.trim().startsWith("◆")) break;
    const m = line.match(/^(\s*)(\S+)\s+(.+)$/);
    if (m === null || line === header) continue;
    const counts = m[3]!.trim().split(/\s+/).filter((t) => COUNT.test(t));
    if (counts.length !== categories.length + 1) continue;

    const name = cleanName(m[2]);
    const indent = m[1]!.length;
    let level: Level;
    let parent: string | null;
    if (name === TOTAL) {
      level = 0;
      parent = null;
    } else if (indent === 0) {
      if (regionName(name) === null && !REGIONS.has(name)) throw new Error(`目的別 ${year}: 字下げなしの ${name} は州でない`);
      level = 1;
      parent = TOTAL;
      region = name;
      market = null;
    } else if (indent < 4) {
      if (region === null) throw new Error(`目的別 ${year} ${name}: 州の前に国がある`);
      level = 2;
      parent = region;
      market = name;
    } else {
      if (market === null) throw new Error(`目的別 ${year} ${name}: 内訳の親がない`);
      level = 3;
      parent = market;
    }
    const [total, ...rest] = counts.map(int);
    rows.push({
      name,
      level,
      parent,
      total: total!,
      values: Object.fromEntries(categories.map((c, i) => [c, rest[i]!])),
    });
  }
  return { year, categories, rows };
}

/** 目的別 PDF の州は「計」がつかない。 */
const REGIONS = new Set(["アジア", "ヨーロッパ", "アフリカ", "北アメリカ", "南アメリカ", "オセアニア"]);

export function parsePurpose(path: string): PurposeYear[] {
  return pages(path)
    .flatMap((p) => parsePurposePage(p) ?? [])
    .sort((a, b) => a.year - b.year);
}
