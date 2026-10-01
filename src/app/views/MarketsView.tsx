/**
 * 国・地域ビュー。年を選ぶと順位、時系列では上位の構成、選んだ国の月別。
 *
 * 一覧と積み上げに出すのは表の「国・地域」の行（州の内側の行）だけで、州で束ね直さない。
 * 中東地域・北欧地域の内訳は一覧では親の直下に置き、積み上げには入れない（親と二重に数えるため）。
 */

import { use, useMemo } from "react";
import type { MarketsJson } from "../../lib/data/cube.ts";
import { loadMarkets } from "../data/load.ts";
import { PICK_COLOR, RANK_COLORS, REST_COLOR, VISITORS_COLOR } from "../data/colors.ts";
import { exact, pct, people, yearLabel } from "../data/format.ts";
import { MonthlyBars } from "../components/MonthlyBars.tsx";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const MEASURES = [
  { value: "count", label: "人数" },
  { value: "share", label: "構成比" },
] as const;

const TOP = RANK_COLORS.length;
const REST = "そのほか";

/** その年の表で「国・地域」の行（level 2）を多い順に。内訳（level 3）は親の直下。 */
function ranking(m: MarketsJson, yi: number): { name: string; value: number; indent: number }[] {
  const at = (n: number) => m.annual[n]![yi] ?? null;
  const markets = m.names
    .map((name, n) => ({ name, n }))
    .filter(({ n }) => m.levels[n]![yi] === 2 && at(n) !== null)
    .sort((a, b) => at(b.n)! - at(a.n)!);
  return markets.flatMap(({ name, n }) => [
    { name, value: at(n)!, indent: 0 },
    ...m.names
      .map((sub, k) => ({ sub, k }))
      .filter(({ k }) => m.levels[k]![yi] === 3 && m.parents[k]![yi] === name && at(k) !== null)
      .map(({ sub, k }) => ({ name: sub, value: at(k)!, indent: 1 })),
  ]);
}

export function MarketsView() {
  const m = use(loadMarkets());
  const total = m.names.indexOf("総数");
  const lastDefinitive = m.years[m.definitive.lastIndexOf(true)]!;

  const [yearParam, setYearParam] = useUrlState<string>("y", String(lastDefinitive), (v) =>
    m.years.includes(Number(v)),
  );
  const year = Number(yearParam);
  const yi = m.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [picked, setPicked] = useUrlState<string>("m", "", (v) => m.names.includes(v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(
    () => ranking(m, m.years.indexOf(lastDefinitive)).filter((r) => r.indent === 0).slice(0, TOP).map((r) => r.name),
    [m, lastDefinitive],
  );
  const colorOf = (name: string) => {
    const k = top.indexOf(name);
    return k < 0 ? undefined : RANK_COLORS[k];
  };

  const rows = useMemo((): RankRow[] => {
    const t = m.annual[total]![yi]!;
    return ranking(m, yi).map((r) => ({
      name: r.name,
      value: r.value,
      label: pct(r.value / t),
      indent: r.indent,
      color: colorOf(r.name),
    }));
  }, [m, yi, total, top]);

  const selected = picked;
  const pickIndex = m.names.indexOf(selected);
  const groups = useMemo(() => groupsSince(m), [m]);

  const columns = useMemo((): Column[] => {
    return m.years.flatMap((yr, k) => {
      if (!m.definitive[k]) return [];
      const t = m.annual[total]![k]!;
      const value = (name: string) => m.annual[m.names.indexOf(name)]?.[k] ?? 0;
      const extra =
        selected !== "" && !top.includes(selected) && !top.includes(m.parents[pickIndex]?.[k] ?? "")
          ? [selected]
          : [];
      const shown = [...top, ...extra].map((name) => ({
        key: name,
        value: value(name),
        color: colorOf(name) ?? PICK_COLOR,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return [{ year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] }];
    });
  }, [m, top, selected, pickIndex, total]);

  const focusIndex = pickIndex < 0 ? total : pickIndex;
  const estimated = useMemo(() => new Set(m.estimated[focusIndex]), [m, focusIndex]);
  const monthly = m.monthly[focusIndex]!;
  const lastMonth = monthly.findLastIndex((v) => v !== null);
  const pickedValue = pickIndex < 0 ? null : (m.annual[pickIndex]![yi] ?? null);
  const yearTotal = m.annual[total]![yi]!;
  const partial = m.months[yi]! < 12;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={m.years} value={year} onChange={(y) => setYearParam(String(y))} />
          <span className="text-[11px] text-faint">総数に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel="総数"
          noneValue={people(yearTotal)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          国・地域を選ぶとグラフでその国だけを濃くし、下に月別を出す。同じ国をもう一度押すか「総数」で解除。
          {partial && " 年の途中は、推計の月に値のない行（その他◯◯など）が一覧に出ない。"}
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">国・地域別の訪日外客数</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{yearLabel(year, m.months[yi]!)}</span>
          {partial && <Preliminary label="推計を含む" />}
          <span className="text-muted">{` · 総数 ${people(yearTotal)}`}</span>
          {pickedValue !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${exact(pickedValue)}（${pct(pickedValue / yearTotal)}）`}</span>
            </>
          )}
          {selected !== "" && pickedValue === null && (
            <span className="text-muted">{` · ${selected}はこの年の表に値がない`}</span>
          )}
          {selected !== "" && (
            <button
              type="button"
              onClick={() => setPicked("")}
              className="ml-2 cursor-pointer rounded border border-rule px-1.5 py-px text-[11px] text-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-rule-strong hover:text-ink active:scale-[0.97]"
            >
              解除
            </button>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted={selected}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`国・地域別の訪日外客数の${measure === "share" ? "構成比" : "人数"}`}
        />
        <Legend top={top} extra={selected !== "" && !top.includes(selected) ? selected : null} />

        <section className="mt-8">
          <h2 className="pb-2 text-[13px] font-semibold">{pickIndex < 0 ? "総数" : selected}の月別</h2>
          <MonthlyBars
            values={monthly.slice(0, lastMonth + 1)}
            start={m.years[0]!}
            estimated={estimated}
            focusedYear={year}
            onFocusYear={(y) => setYearParam(String(y))}
            color={colorOf(selected) ?? (pickIndex < 0 ? VISITORS_COLOR : PICK_COLOR)}
            height={200}
            label={`${pickIndex < 0 ? "総数" : selected}の月別の訪日外客数`}
          />
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            色のついた{TOP}か国・地域は{lastDefinitive}年の上位。「{REST}」は総数からそれらを引いた残りで、州で束ね直してはいない。積み上げは年の確定値がある{m.years[0]}–{lastDefinitive}年。
          </li>
          <li>
            表に載る国・地域は年によって違う。「その他アジア」などの行は{firstYearOf(m, "その他アジア")}年から。
            {groups.map((g) => `${g.name}（${g.members.join("・")}）は${g.since}年から`).join("、")}行がある。
          </li>
          <li>年の途中の値は、JNTO が公表済みの月までの累計。推計の月は月別の棒で薄くしている。</li>
        </ul>
      </main>
    </div>
  );
}

function firstYearOf(m: MarketsJson, name: string): number | undefined {
  const n = m.names.indexOf(name);
  return m.years.find((_, k) => m.levels[n]?.[k] != null);
}

/** 内訳を持つ行（中東地域・北欧地域）と、その行が表に現れた年。 */
function groupsSince(m: MarketsJson): { name: string; members: string[]; since: number }[] {
  const last = m.years.length - 1;
  return m.names.flatMap((name, n) => {
    const members = m.names.filter((_, k) => m.levels[k]![last] === 3 && m.parents[k]![last] === name);
    const since = firstYearOf(m, name);
    return members.length === 0 || since === undefined || m.levels[n]![last] !== 2 ? [] : [{ name, members, since }];
  });
}

function Legend({ top, extra }: { top: string[]; extra: string | null }) {
  const items = [
    ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
    ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
    { name: REST, color: REST_COLOR },
  ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[46px] text-[11px] text-muted">
      {items.map((it) => (
        <li key={it.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: it.color }} />
          {it.name}
        </li>
      ))}
    </ul>
  );
}
