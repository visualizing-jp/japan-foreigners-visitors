/**
 * 正規化 JSON の健全性チェック。1つでも落ちたら終了コード 1。
 *
 * 3表は同じ訪日外客数を別の切り口で載せているので、互いに突き合わせる。
 * - 年別の訪日外客数 ＝ 月別の総数の累計 ＝ 目的別の総数
 * - 国・地域ごとの月別の累計 ＝ 目的別の総数（両方の表にある年・行）
 * 表の中では、州の合計 ＝ 総数、内訳の合計 ＝ 親、目的の合計 ＝ 行の総数。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnnualRow, MonthlyYear, PurposeYear, TableRow } from "../src/lib/parse/types.ts";

const DIR = resolve(import.meta.dirname, "../data/normalized");
const read = async <T>(name: string) => JSON.parse(await readFile(resolve(DIR, `${name}.json`), "utf8")) as T;

const annual = await read<AnnualRow[]>("annual");
const monthly = await read<MonthlyYear[]>("monthly");
const purpose = await read<PurposeYear[]>("purpose");

const failures: string[] = [];
let checks = 0;

function check(ok: boolean, message: string): void {
  checks++;
  if (!ok) failures.push(message);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** 推計値は百人単位に丸めてある（2026年7月の韓国 894,700 など）ので、子1つにつき百人までずれ得る。 */
const ROUNDING = 100;

/**
 * 親子の合計。子に「その他◯◯」があれば親と一致、なければ（2015年以前の州など）親以下。
 * value が null の行が混じる組は比べない（年の途中で州の値が出ていない月）。
 */
function checkTree<R extends TableRow>(
  where: string,
  rows: R[],
  value: (r: R) => number | null,
  rounded = false,
): void {
  for (const parent of rows) {
    const children = rows.filter((r) => r.parent === parent.name && r.level === parent.level + 1);
    if (children.length === 0) continue;
    const p = value(parent);
    const cs = children.map(value);
    if (p === null || cs.some((c) => c === null)) continue;
    const s = sum(cs as number[]);
    const tolerance = rounded ? ROUNDING * children.length : 0;
    const complete = parent.level === 0 || parent.level === 2 || children.some((c) => c.name.startsWith("その他"));
    check(
      complete ? Math.abs(s - p) <= tolerance : s <= p + tolerance,
      `${where} ${parent.name}: 内訳の合計 ${s} ${complete ? "≠" : ">"} ${p}`,
    );
  }
}

// —— 年別 ——
annual.forEach((r, i) => {
  check(i === 0 || r.year === annual[i - 1]!.year + 1, `年別: ${r.year} の前の年が抜けている`);
  check(r.visitors > 0 && r.outbound > 0, `年別 ${r.year}: 人数が正でない`);
});
const annualOf = new Map(annual.map((r) => [r.year, r]));

// —— 月別 ——
for (const y of monthly) {
  const names = y.rows.map((r) => r.name);
  check(new Set(names).size === names.length, `月別 ${y.year}: 名前が重複`);
  check(y.rows[0]?.level === 0, `月別 ${y.year}: 先頭が総数でない`);
  for (let m = 0; m < 12; m++) {
    const rounded = y.rows.some((r) => r.estimated.includes(m));
    checkTree(`月別 ${y.year}-${m + 1}`, y.rows, (r) => r.months[m] ?? null, rounded);
  }
  checkTree(`月別 ${y.year} 累計`, y.rows, (r) => r.cumulative, y.rows.some((r) => r.estimated.length > 0));

  if (y.definitive) {
    for (const r of y.rows) {
      const months = r.months.filter((v): v is number => v !== null);
      check(months.length === 12, `月別 ${y.year} ${r.name}: 確定年なのに月が欠けている`);
      check(sum(months) === r.cumulative, `月別 ${y.year} ${r.name}: 12か月の合計 ${sum(months)} ≠ 累計 ${r.cumulative}`);
    }
    const a = annualOf.get(y.year);
    check(a !== undefined, `月別 ${y.year}: 年別の表にない`);
    if (a !== undefined) {
      check(y.rows[0]!.cumulative === a.visitors, `月別 ${y.year}: 累計 ${y.rows[0]!.cumulative} ≠ 年別 ${a.visitors}`);
    }
  } else {
    check(annualOf.get(y.year) === undefined, `月別 ${y.year}: 確定値でないのに年別の表にある`);
  }
}
const monthlyOf = new Map(monthly.map((y) => [y.year, y]));

// —— 目的別 ——
for (const y of purpose) {
  check(y.rows.length > 0, `目的別 ${y.year}: 行がない`);
  check(y.categories.length >= 3, `目的別 ${y.year}: 目的が ${y.categories.join("・")}`);
  for (const r of y.rows) {
    const s = sum(Object.values(r.values));
    check(s === r.total, `目的別 ${y.year} ${r.name}: 目的の合計 ${s} ≠ 総数 ${r.total}`);
  }
  checkTree(`目的別 ${y.year}`, y.rows, (r) => r.total);
  for (const c of y.categories) checkTree(`目的別 ${y.year} ${c}`, y.rows, (r) => r.values[c] ?? null);

  const a = annualOf.get(y.year);
  check(a !== undefined && y.rows[0]?.total === a.visitors, `目的別 ${y.year}: 総数 ${y.rows[0]?.total} ≠ 年別 ${a?.visitors}`);

  const mo = monthlyOf.get(y.year);
  if (mo === undefined) {
    check(false, `目的別 ${y.year}: 月別の表にない`);
    continue;
  }
  const byName = new Map(mo.rows.map((r) => [r.name, r]));
  for (const r of y.rows) {
    const m = byName.get(r.name);
    // 2015年以前の月別の表には「その他◯◯」の行がない。
    // 2022年の月別の表は北欧4か国を並べるだけで「北欧地域」の行がない（内訳は両表にある）。
    const children = y.rows.filter((c) => c.parent === r.name && c.level === 3);
    const allowed =
      (r.name.startsWith("その他") && y.year <= 2015) ||
      (children.length > 0 && children.every((c) => byName.has(c.name)));
    check(m !== undefined || allowed, `目的別 ${y.year} ${r.name}: 月別の表にない`);
    if (m === undefined) continue;
    check(m.cumulative === r.total, `目的別 ${y.year} ${r.name}: 総数 ${r.total} ≠ 月別の累計 ${m.cumulative}`);
  }
}

if (failures.length > 0) {
  console.error(`✗ ${failures.length}/${checks} 件が不一致`);
  for (const f of failures.slice(0, 60)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ ${checks} 件すべて一致`);
