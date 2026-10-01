/**
 * 目的ビュー。国・地域を選ぶと、観光・商用・その他の構成が年ごとにどう変わったかを見せる。
 * 一覧は表の並び（州 → 国・地域 → 内訳）のまま。右端は観光客の割合。
 */

import { use, useMemo } from "react";
import type { PurposeJson } from "../../lib/data/cube.ts";
import { loadPurpose } from "../data/load.ts";
import { PURPOSE_COLORS } from "../data/colors.ts";
import { exact, pct } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const MEASURES = [
  { value: "share", label: "構成比" },
  { value: "count", label: "人数" },
] as const;

const TOTAL = "総数";
const TOURISM = "観光客";

function yearsWith(p: PurposeJson, category: string): number[] {
  const c = p.categories.indexOf(category);
  return p.years.filter((_, k) => p.values[c]![0]![k] !== null);
}

export function PurposeView() {
  const p = use(loadPurpose());
  const last = p.years.at(-1)!;

  const [yearParam, setYearParam] = useUrlState<string>("y", String(last), (v) => p.years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = p.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "share", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;
  const [name, setName] = useUrlState<string>("m", TOTAL, (v) => p.names.includes(v));
  const n = p.names.indexOf(name);

  const tourism = p.categories.indexOf(TOURISM);
  const rows = useMemo(
    (): RankRow[] =>
      p.names.flatMap((nm, k) => {
        const level = p.levels[k]![yi];
        const total = p.total[k]![yi];
        if (level == null || level === 0 || total == null) return [];
        const share = p.values[tourism]![k]![yi]! / total;
        return [{ name: nm, value: share, label: pct(share), indent: level - 1 }];
      }),
    [p, yi, tourism],
  );

  const columns = useMemo(
    (): Column[] =>
      p.years.flatMap((yr, k) => {
        const total = p.total[n]![k];
        if (total == null) return [];
        return [
          {
            year: yr,
            total,
            segments: p.categories.flatMap((c, ci) => {
              const v = p.values[ci]![n]![k];
              return v == null ? [] : [{ key: c, value: v, color: PURPOSE_COLORS[c] ?? "#a8a299" }];
            }),
          },
        ];
      }),
    [p, n],
  );

  const total = p.total[n]![yi] ?? null;
  const transit = yearsWith(p, "一時上陸客");

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={p.years} value={year} onChange={(y) => setYearParam(String(y))} />
          <span className="text-[11px] text-faint">観光客の割合</span>
        </div>
        <RankList
          rows={rows}
          selected={name === TOTAL ? "" : name}
          onSelect={(nm) => setName(nm === "" || nm === name ? TOTAL : nm)}
          noneLabel={TOTAL}
          noneValue={pct(p.values[tourism]![0]![yi]! / p.total[0]![yi]!)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          州・国・地域を選ぶと、右のグラフをその行の構成に切り替える。並びは JNTO の表のまま。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">{name}の目的別の訪日外客数</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{year}年</span>
          {total === null ? (
            <span className="text-muted">{` · ${name}はこの年の表にない`}</span>
          ) : (
            <>
              <span className="text-muted">{` · 計 ${exact(total)}`}</span>
              {p.categories.map((c, ci) => {
                const v = p.values[ci]![n]![yi];
                if (v == null) return null;
                return (
                  <span key={c}>
                    <span className="text-muted"> · </span>
                    <span
                      aria-hidden
                      className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                      style={{ backgroundColor: PURPOSE_COLORS[c] }}
                    />
                    <span className={c === TOURISM ? "font-semibold" : ""}>{c}</span>
                    <span className="text-muted">{` ${pct(v / total)}`}</span>
                  </span>
                );
              })}
            </>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted=""
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`${name}の目的別の訪日外客数の${measure === "share" ? "構成比" : "人数"}`}
        />
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[46px] text-[11px] text-muted">
          {p.categories.map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: PURPOSE_COLORS[c] }} />
              {c}
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            「観光客」は短期滞在の入国者から商用客を引いたもので、親族・友人訪問を含む。「その他客」は観光・商用以外で、留学・研修・外交・公用などを含む（JNTO の表の注）。
          </li>
          {transit.length > 0 && (
            <li>
              「一時上陸客」の列は {transit[0]}–{transit.at(-1)}年の表だけにある。それより後の表は3区分。
            </li>
          )}
          <li>目的別は年の確定値だけで、月別はない。{p.years[0]}年から。</li>
        </ul>
      </main>
    </div>
  );
}
