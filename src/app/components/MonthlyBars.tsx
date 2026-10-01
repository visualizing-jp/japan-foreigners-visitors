/**
 * 月別の棒。2003年1月から最新月まで横に並べる。
 * 選んだ年の12本だけを濃くし、推計の月は薄くして区別する。
 */

import { scaleBand, scaleLinear } from "d3-scale";
import { monthOf, people, tickMan } from "../data/format.ts";
import { useWidth } from "../hooks/useWidth.ts";

export function MonthlyBars({
  values,
  start,
  estimated,
  focusedYear,
  onFocusYear,
  color,
  height = 260,
  label,
}: {
  values: (number | null)[];
  start: number;
  estimated: ReadonlySet<number>;
  focusedYear: number;
  onFocusYear: (year: number) => void;
  color: string;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = { left: 46, right: 6, top: 12, bottom: 28 };
  const index = values.map((_, i) => i);
  const x = scaleBand<number>()
    .domain(index)
    .range([M.left, Math.max(M.left + 1, width - M.right)])
    .paddingInner(0.2);
  const y = scaleLinear()
    .domain([0, Math.max(...values.map((v) => v ?? 0), 1)])
    .nice(4)
    .range([height - M.bottom, M.top]);

  const years = values.length / 12;
  const every = width / years < 22 ? 5 : width / years < 40 ? 2 : 1;
  const lastYear = start + Math.ceil(years) - 1;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tickMan(t)}
              </text>
            </g>
          ))}

          {Array.from({ length: Math.ceil(years) }, (_, k) => start + k).map((yr) => {
            const i0 = (yr - start) * 12;
            const x0 = x(i0)!;
            const x1 = (x(Math.min(i0 + 11, values.length - 1)) ?? x0) + x.bandwidth();
            const focused = yr === focusedYear;
            return (
              <g
                key={yr}
                role="button"
                tabIndex={0}
                aria-pressed={focused}
                aria-label={`${yr}年`}
                onClick={() => onFocusYear(yr)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onFocusYear(yr);
                  }
                }}
                className="group cursor-pointer outline-none"
              >
                <rect
                  x={x0 - 1}
                  width={x1 - x0 + 2}
                  y={M.top}
                  height={height - M.top - M.bottom + 2}
                  className={`group-focus-visible:stroke-ink group-focus-visible:stroke-2 ${
                    focused ? "fill-ink/[0.045]" : "fill-transparent hover:fill-ink/[0.025]"
                  }`}
                />
                {(yr % every === 0 || yr === lastYear) && (
                  <text
                    x={(x0 + x1) / 2}
                    y={height - M.bottom + 16}
                    textAnchor="middle"
                    className={`tnum text-[10.5px] ${focused ? "fill-ink font-semibold" : "fill-muted"}`}
                  >
                    {yr}
                  </text>
                )}
              </g>
            );
          })}

          <g className="pointer-events-none">
            {values.map((v, i) => {
              if (v === null) return null;
              const { year, month } = monthOf(i, start);
              const est = estimated.has(i);
              return (
                <rect
                  key={i}
                  x={x(i)}
                  width={Math.max(1, x.bandwidth())}
                  y={y(v)}
                  height={Math.max(0, y(0) - y(v))}
                  fill={year === focusedYear ? color : "currentColor"}
                  className={`transition-[fill,opacity] duration-150 ease-out ${year === focusedYear ? "" : "text-ink/25"}`}
                  opacity={est ? 0.4 : 1}
                >
                  <title>{`${year}年${month}月 ${people(v)}${est ? "（推計）" : ""}`}</title>
                </rect>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
