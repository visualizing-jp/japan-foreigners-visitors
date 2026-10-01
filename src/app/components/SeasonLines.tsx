/**
 * 季節。1月から12月を横軸に、年ごとの線を重ねる。
 * 選んだ年を濃く、前の年を細く、ほかの年は薄い地として残す。推計の月は破線。
 */

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { tickMan } from "../data/format.ts";
import { useWidth } from "../hooks/useWidth.ts";

export interface SeasonYear {
  year: number;
  months: (number | null)[];
  estimated: ReadonlySet<number>;
}

export function SeasonLines({
  years,
  focused,
  onFocus,
  color,
  height = 300,
}: {
  years: SeasonYear[];
  focused: number;
  onFocus: (year: number) => void;
  color: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = { left: 46, right: 44, top: 14, bottom: 28 };
  const x = scaleLinear().domain([0, 11]).range([M.left, Math.max(M.left + 1, width - M.right)]);
  const y = scaleLinear()
    .domain([0, Math.max(...years.flatMap((s) => s.months.map((v) => v ?? 0)), 1)])
    .nice(4)
    .range([height - M.bottom, M.top]);

  const path = (months: (number | null)[], keep: (m: number) => boolean) =>
    line<number | null>()
      .defined((v, m) => v !== null && keep(m))
      .x((_, m) => x(m))
      .y((v) => y(v!))(months) ?? "";

  const focus = years.find((s) => s.year === focused);
  const prev = years.find((s) => s.year === focused - 1);
  const lastIndex = (s: SeasonYear) => s.months.findLastIndex((v) => v !== null);

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="年ごとの月別の訪日外客数" className="block">
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tickMan(t)}
              </text>
            </g>
          ))}
          {Array.from({ length: 12 }, (_, m) => (
            <text key={m} x={x(m)} y={height - M.bottom + 16} textAnchor="middle" className="tnum fill-muted text-[10.5px]">
              {m + 1}月
            </text>
          ))}

          {years.map((s) => (
            <path
              key={s.year}
              d={path(s.months, () => true)}
              fill="none"
              strokeWidth={6}
              className="cursor-pointer stroke-transparent"
              onClick={() => onFocus(s.year)}
            >
              <title>{`${s.year}年`}</title>
            </path>
          ))}
          <g className="pointer-events-none">
            {years.map((s) => (
              <path key={s.year} d={path(s.months, () => true)} fill="none" strokeWidth={1} className="stroke-ink/[0.12]" />
            ))}
            {prev !== undefined && (
              <>
                <path d={path(prev.months, () => true)} fill="none" strokeWidth={1.25} className="stroke-ink/55" />
                <text
                  x={x(lastIndex(prev)) + 6}
                  y={y(prev.months[lastIndex(prev)]!)}
                  dy="0.32em"
                  className="tnum fill-muted text-[10.5px]"
                >
                  {prev.year}
                </text>
              </>
            )}
            {focus !== undefined && (
              <>
                <path
                  d={path(focus.months, (m) => !focus.estimated.has(m))}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.25}
                />
                {focus.estimated.size > 0 && (
                  <path
                    d={path(focus.months, (m) => focus.estimated.has(m) || focus.estimated.has(m + 1))}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.25}
                    strokeDasharray="3 3"
                  />
                )}
                <text
                  x={x(lastIndex(focus)) + 6}
                  y={y(focus.months[lastIndex(focus)]!)}
                  dy="0.32em"
                  className="tnum fill-ink text-[11px] font-semibold"
                >
                  {focus.year}
                </text>
              </>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
