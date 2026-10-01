/**
 * data/raw/ の3表を読み、正規化 JSON を data/normalized/ に書き出す。
 * PDF の読み取りに poppler の pdftotext を使う。
 *
 *   npm run normalize
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMonthly } from "../src/lib/parse/monthly.ts";
import { parseAnnual, parsePurpose } from "../src/lib/parse/pdf.ts";
import { rawPath } from "./fetch-data.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/normalized");

async function write(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(OUT_DIR, `${name}.json`), `${JSON.stringify(value, null, 1)}\n`);
}

await mkdir(OUT_DIR, { recursive: true });

const annual = parseAnnual(rawPath("annual"));
await write("annual", annual);
console.log(`  annual   ${annual[0]?.year}–${annual.at(-1)?.year}  ${annual.length}年`);

const monthly = parseMonthly(rawPath("monthly"));
await write("monthly", monthly);
const estimated = monthly.flatMap((y) => y.rows.flatMap((r) => r.estimated.map((m) => `${y.year}-${m + 1}`)));
console.log(
  `  monthly  ${monthly[0]?.year}–${monthly.at(-1)?.year}  推計の月 ${[...new Set(estimated)].join("、") || "なし"}`,
);

const purpose = parsePurpose(rawPath("purpose"));
await write("purpose", purpose);
console.log(
  `  purpose  ${purpose[0]?.year}–${purpose.at(-1)?.year}  目的 ${[...new Set(purpose.flatMap((p) => p.categories))].join("・")}`,
);
