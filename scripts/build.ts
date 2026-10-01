/**
 * 正規化 JSON（data/normalized）だけを入力に、配信データを public/data/ に書き出す。
 *
 *   npm run data
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EraJson, Level, MarketsJson, PurposeJson } from "../src/lib/data/cube.ts";
import type { AnnualRow, MonthlyYear, PurposeYear, TableRow } from "../src/lib/parse/types.ts";

const IN_DIR = resolve(import.meta.dirname, "../data/normalized");
const OUT_DIR = resolve(import.meta.dirname, "../public/data");

const read = async <T>(name: string) => JSON.parse(await readFile(resolve(IN_DIR, `${name}.json`), "utf8")) as T;

async function writeJson(name: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  await writeFile(resolve(OUT_DIR, `${name}.json`), json);
  console.log(`  ${name}.json  ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB`);
}

/** 最新年の表の並びを基本に、古い年にしかない行をその年の位置の近くに差し込む。 */
function nameOrder(tables: { rows: TableRow[] }[]): string[] {
  const order: string[] = [];
  for (const t of [...tables].reverse()) {
    t.rows.forEach((r, i) => {
      if (order.includes(r.name)) return;
      const prev = t.rows.slice(0, i).reverse().find((p) => order.includes(p.name));
      order.splice(prev === undefined ? 0 : order.indexOf(prev.name) + 1, 0, r.name);
    });
  }
  return order;
}

function grid<R extends TableRow, T>(
  names: string[],
  tables: { rows: R[] }[],
  pick: (r: R) => T,
): (T | null)[][] {
  return names.map((n) =>
    tables.map((t) => {
      const r = t.rows.find((x) => x.name === n);
      return r === undefined ? null : pick(r);
    }),
  );
}

const annual = await read<AnnualRow[]>("annual");
const monthly = await read<MonthlyYear[]>("monthly");
const purpose = await read<PurposeYear[]>("purpose");

await mkdir(OUT_DIR, { recursive: true });

const totalOf = (y: MonthlyYear) => y.rows.find((r) => r.level === 0)!;
const monthlyTotal = monthly.flatMap((y) => totalOf(y).months);
const lastMonth = monthlyTotal.findLastIndex((v) => v !== null);

const era: EraJson = {
  annual: {
    years: annual.map((r) => r.year),
    visitors: annual.map((r) => r.visitors),
    outbound: annual.map((r) => r.outbound),
  },
  monthly: {
    start: monthly[0]!.year,
    values: monthlyTotal.slice(0, lastMonth + 1),
    estimated: monthly.flatMap((y, yi) => totalOf(y).estimated.map((m) => yi * 12 + m)),
  },
  confirmedThrough: annual.at(-1)!.year,
};
await writeJson("era", era);

const mNames = nameOrder(monthly);
const markets: MarketsJson = {
  years: monthly.map((y) => y.year),
  definitive: monthly.map((y) => y.definitive),
  months: monthly.map((y) => totalOf(y).months.filter((v) => v !== null).length),
  names: mNames,
  levels: grid(mNames, monthly, (r) => r.level as Level),
  parents: grid(mNames, monthly, (r) => r.parent),
  annual: grid(mNames, monthly, (r) => r.cumulative).map((row) => row.map((v) => v ?? null)),
  monthly: mNames.map((n) =>
    monthly.flatMap((y) => y.rows.find((r) => r.name === n)?.months ?? Array<null>(12).fill(null)),
  ),
  estimated: mNames.map((n) =>
    monthly.flatMap((y, yi) => (y.rows.find((r) => r.name === n)?.estimated ?? []).map((m) => yi * 12 + m)),
  ),
};
await writeJson("markets", markets);

const pNames = nameOrder(purpose);
const categories = [...new Set(purpose.flatMap((p) => p.categories))];
const purposeJson: PurposeJson = {
  years: purpose.map((p) => p.year),
  categories,
  names: pNames,
  levels: grid(pNames, purpose, (r) => r.level as Level),
  parents: grid(pNames, purpose, (r) => r.parent),
  total: grid(pNames, purpose, (r) => r.total),
  values: categories.map((c) => grid(pNames, purpose, (r) => r.values[c] ?? null).map((row) => row.map((v) => v ?? null))),
};
await writeJson("purpose", purposeJson);
