/**
 * 時代ビュー。年次（1964–）の訪日外客と出国日本人、月別の推移、季節の重なり。
 */

import { use, useMemo } from "react";
import type { EraJson } from "../../lib/data/cube.ts";
import { loadEra } from "../data/load.ts";
import { OUTBOUND_COLOR, VISITORS_COLOR } from "../data/colors.ts";
import { exact, people, yearLabel } from "../data/format.ts";
import { AnnualLines } from "../components/AnnualLines.tsx";
import { MonthlyBars } from "../components/MonthlyBars.tsx";
import { SeasonLines, type SeasonYear } from "../components/SeasonLines.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const SCALES = [
  { value: "year", label: "年次" },
  { value: "month", label: "月次" },
  { value: "season", label: "季節" },
] as const;

type Scale = (typeof SCALES)[number]["value"];

export function EraView() {
  const era = use(loadEra());
  const { annual, monthly } = era;

  const seasons = useMemo((): SeasonYear[] => {
    const count = Math.ceil(monthly.values.length / 12);
    const est = new Set(monthly.estimated);
    return Array.from({ length: count }, (_, k) => ({
      year: monthly.start + k,
      months: Array.from({ length: 12 }, (_, m) => monthly.values[k * 12 + m] ?? null),
      estimated: new Set(Array.from({ length: 12 }, (_, m) => m).filter((m) => est.has(k * 12 + m))),
    }));
  }, [monthly]);
  const monthYears = seasons.map((s) => s.year);
  const lastMonthYear = monthYears.at(-1)!;

  const [scale, setScale] = useUrlState<Scale>("scale", "year", (v) => SCALES.some((s) => s.value === v));
  const [yearParam, setYearParam] = useUrlState<string>("y", String(era.confirmedThrough), (v) => {
    const n = Number(v);
    return annual.years.includes(n) || monthYears.includes(n);
  });
  const year = Number(yearParam);
  const setYear = (y: number) => setYearParam(String(y));

  const estimatedSet = useMemo(() => new Set(monthly.estimated), [monthly.estimated]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-[19px] font-semibold tracking-tight">
          {scale === "year" ? "訪日外客数と出国日本人数" : "月別の訪日外客数"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {scale !== "year" && (
            <YearSelect years={monthYears} value={monthYears.includes(year) ? year : lastMonthYear} onChange={setYear} />
          )}
          <Segmented label="尺度" options={SCALES} value={scale} onChange={setScale} />
        </div>
      </header>

      {scale === "year" && <YearPanel era={era} year={year} setYear={setYear} />}
      {scale === "month" && (
        <>
          <MonthReadout seasons={seasons} year={monthYears.includes(year) ? year : lastMonthYear} />
          <MonthlyBars
            values={monthly.values}
            start={monthly.start}
            estimated={estimatedSet}
            focusedYear={monthYears.includes(year) ? year : lastMonthYear}
            onFocusYear={setYear}
            color={VISITORS_COLOR}
            height={300}
            label="月別の訪日外客数（2003年1月から）"
          />
        </>
      )}
      {scale === "season" && (
        <>
          <MonthReadout seasons={seasons} year={monthYears.includes(year) ? year : lastMonthYear} />
          <SeasonLines
            years={seasons}
            focused={monthYears.includes(year) ? year : lastMonthYear}
            onFocus={setYear}
            color={VISITORS_COLOR}
          />
        </>
      )}

      <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
        {scale === "year" ? (
          <>
            <li>
              訪日外客数は {annual.years[0]}–{era.confirmedThrough}年の確定値。出国日本人数は法務省「出入国管理統計」の出入（帰）国者数（JNTO の表による）。
            </li>
            <li>丸印は、訪日外客数と出国日本人数の多い少ないが入れ替わった年。</li>
          </>
        ) : (
          <>
            <li>月別は2003年1月から。{era.confirmedThrough + 1}年以降は年の確定値が出ていない。</li>
            <li>推計の月（JNTO の表で斜体）は薄く、季節では破線で示す。推計値は百人単位に丸めてある。</li>
            {scale === "season" && <li>細い黒線は前の年。薄い線はそのほかの年。線を押すとその年を選ぶ。</li>}
          </>
        )}
      </ul>
    </div>
  );
}

function YearPanel({
  era,
  year,
  setYear,
}: {
  era: EraJson;
  year: number;
  setYear: (y: number) => void;
}) {
  const { years, visitors, outbound } = era.annual;
  const focused = years.includes(year) ? year : era.confirmedThrough;
  const i = years.indexOf(focused);
  return (
    <>
      <p className="tnum min-h-9 pb-3 text-[12.5px]">
        <span className="font-semibold">{focused}年</span>
        <span className="text-muted"> · </span>
        <Swatch color={VISITORS_COLOR} />
        <span className="font-semibold">訪日外客</span>
        <span className="text-muted">{` ${exact(visitors[i]!)}`}</span>
        <span className="text-muted"> · </span>
        <Swatch color={OUTBOUND_COLOR} />
        <span>出国日本人</span>
        <span className="text-muted">{` ${exact(outbound[i]!)}`}</span>
      </p>
      <AnnualLines years={years} visitors={visitors} outbound={outbound} focused={focused} onFocus={setYear} />
    </>
  );
}

function MonthReadout({ seasons, year }: { seasons: SeasonYear[]; year: number }) {
  const s = seasons.find((x) => x.year === year)!;
  const known = s.months.filter((v): v is number => v !== null);
  const peak = Math.max(...known);
  const peakMonth = s.months.indexOf(peak) + 1;
  return (
    <p className="tnum min-h-9 pb-3 text-[12.5px]">
      <span className="font-semibold">{yearLabel(year, known.length)}</span>
      {s.estimated.size > 0 && <Preliminary label="推計を含む" />}
      <span className="text-muted">{` · 計 ${people(known.reduce((a, b) => a + b, 0))}`}</span>
      <span className="text-muted">{` · 最多は${peakMonth}月 ${people(peak)}`}</span>
    </p>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="mr-1 inline-block h-[3px] w-3 align-middle" style={{ backgroundColor: color }} />;
}
