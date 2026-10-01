/**
 * 「国籍/月別 訪日外客数」Excel を読む。1年1シート。
 *
 * 列の位置は年で揺れる（2020年以降は名前が2列、それ以前は1列）。
 * そこで「1月」の見出しの位置から月の列を決め、その左を名前の列とする。
 * 2列目に置かれた名前は、直前の国・地域（中東地域・北欧地域）の内訳。
 *
 * 推計値は斜体で示される（シートの注２）。SheetJS の無償版はフォントを返さないので、
 * xlsx の中の styles.xml とシート XML から斜体のセルを拾う。
 */

import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { TOTAL, cleanName, regionName } from "./names.ts";
import type { Level, MonthlyRow, MonthlyYear } from "./types.ts";

XLSX.set_fs(fs);

type Row = unknown[];

const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

function text(wb: XLSX.WorkBook, path: string): string {
  const file = (wb as unknown as { files: Record<string, { content: Uint8Array }> }).files[path];
  if (file === undefined) throw new Error(`xlsx に ${path} がない`);
  return new TextDecoder().decode(file.content);
}

/** 斜体のフォントを使う書式（cellXfs）の番号。 */
function italicStyles(wb: XLSX.WorkBook): Set<number> {
  const styles = text(wb, "xl/styles.xml");
  const fonts = [...(styles.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/)?.[1] ?? "").matchAll(/<font(?:\/>|>[\s\S]*?<\/font>)/g)];
  const italicFonts = new Set(fonts.flatMap((f, i) => (f[0].includes("<i/>") ? [i] : [])));
  const xfs = [...(styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").matchAll(/<xf [^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)];
  return new Set(
    xfs.flatMap((x, i) => (italicFonts.has(Number(x[0].match(/fontId="(\d+)"/)?.[1])) ? [i] : [])),
  );
}

/** シート名 → 斜体で値の入ったセル番地。 */
function italicCells(wb: XLSX.WorkBook): Map<string, Set<string>> {
  const italic = italicStyles(wb);
  const book = text(wb, "xl/workbook.xml");
  const rels = text(wb, "xl/_rels/workbook.xml.rels");
  const target = new Map(
    [...rels.matchAll(/<Relationship [^>]*>/g)].map((m) => [
      m[0].match(/Id="([^"]+)"/)![1]!,
      m[0].match(/Target="([^"]+)"/)![1]!,
    ]),
  );
  const out = new Map<string, Set<string>>();
  for (const m of book.matchAll(/<sheet [^>]*>/g)) {
    const name = m[0].match(/name="([^"]+)"/)![1]!;
    const id = m[0].match(/r:id="([^"]+)"/)![1]!;
    const xml = text(wb, `xl/${target.get(id)!.replace(/^\/?xl\//, "")}`);
    const cells = new Set<string>();
    for (const c of xml.matchAll(/<c r="([A-Z]+\d+)" s="(\d+)"[^>]*>\s*<v>/g)) {
      if (italic.has(Number(c[2]))) cells.add(c[1]!);
    }
    out.set(name, cells);
  }
  return out;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function parseSheet(rows: Row[], year: number, italic: Set<string>): MonthlyYear {
  const h = rows.findIndex((r) => r.includes("1月"));
  if (h < 0) throw new Error(`${year}: 「1月」の見出しがない`);
  const header = rows[h]!;
  const monthCols = MONTHS.map((m) => {
    const c = header.indexOf(m);
    if (c < 0) throw new Error(`${year}: 見出しに ${m} がない`);
    return c;
  });
  // 2008・2009年のシートだけ「年計」と書く。
  const cumCol = header.findIndex((v) => v === "累計" || v === "年計");
  const nameCols = monthCols[0]!;

  const out: MonthlyRow[] = [];
  let note = "";
  let region: string | null = null;
  let market: string | null = null;

  rows.slice(h + 1).forEach((r, i) => {
    const at = r.slice(0, nameCols).findIndex((v) => v !== null && String(v).trim() !== "");
    if (at < 0) return;
    const raw = String(r[at]);
    if (/^注/.test(raw.trim())) {
      if (/^注[２2]/.test(raw.trim())) note = raw.replace(/^注[２2][：:]\s*/, "").trim();
      return;
    }
    const months = monthCols.map((c) => num(r[c]));
    const cumulative = cumCol < 0 ? null : num(r[cumCol]);
    if (months.every((v) => v === null) && cumulative === null) return;

    const excelRow = h + 1 + i + 1;
    const estimated = monthCols.flatMap((c, m) =>
      italic.has(XLSX.utils.encode_cell({ r: excelRow - 1, c })) ? [m] : [],
    );

    const name = cleanName(raw);
    let level: Level;
    let parent: string | null;
    let label = name;
    const asRegion = regionName(name);
    if (name === TOTAL) {
      level = 0;
      parent = null;
    } else if (asRegion !== null) {
      label = asRegion;
      level = 1;
      parent = TOTAL;
      region = asRegion;
      market = null;
    } else if (at > 0) {
      if (market === null) throw new Error(`${year} ${name}: 内訳の親がない`);
      level = 3;
      parent = market;
    } else {
      if (region === null) throw new Error(`${year} ${name}: 州の前に国がある`);
      level = 2;
      parent = region;
      market = name;
    }
    out.push({ name: label, level, parent, months, estimated, cumulative });
  });

  const definitive = note.includes("確定値");
  if (!definitive && !note.includes("推計値")) throw new Error(`${year}: 注２を読めない「${note}」`);
  // 確定年の斜体は書式の名残で、推計の印ではない（注２が「すべて確定値」と言っている）。
  if (definitive) for (const row of out) row.estimated = [];
  return { year, note, definitive, rows: out };
}

export function parseMonthly(path: string): MonthlyYear[] {
  const wb = XLSX.readFile(path, { bookFiles: true });
  const italic = italicCells(wb);
  return wb.SheetNames.map((name) => {
    const year = Number(name);
    if (!Number.isInteger(year)) throw new Error(`シート名が年でない: ${name}`);
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name]!, { header: 1, raw: true, defval: null });
    return parseSheet(rows, year, italic.get(name) ?? new Set());
  }).sort((a, b) => a.year - b.year);
}
