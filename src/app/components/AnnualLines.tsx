/**
 * 年次の2本線。訪日外客数と出国日本人数。
 * 2本が入れ替わった年に印をつける。どちらが多いかは表の値から決まり、注釈を手で置かない。
 */

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { OUTBOUND_COLOR, VISITORS_COLOR } from "../data/colors.ts";
import { tickMan } from "../data/format.ts";
import { useWidth } from "../hooks/useWidth.ts";

export function AnnualLines({
  years,
  visitors,
  outbound,
  focused,
  onFocus,
  height = 340,
}: {
  years: number[];
  visitors: number[];
  outbound: number[];
  focused: number;
  onFocus: (year: number) => void;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = { left: 46, right: 74, top: 16, bottom: 28 };
  const first = years[0]!;
  const last = years.at(-1)!;
  const x = scaleLinear().domain([first, last]).range([M.left, Math.max(M.left + 1, width - M.right)]);
  const y = scaleLinear()
    .domain([0, Math.max(...visitors, ...outbound)])
    .nice(5)
    .range([height - M.bottom, M.top]);
  const path = (values: number[]) => line<number>((_, i) => x(years[i]!), (v) => y(v))(values) ?? "";

  const crossings = years.slice(1).flatMap((yr, i) => {
    const before = visitors[i]! > outbound[i]!;
    const after = visitors[i + 1]! > outbound[i + 1]!;
    return before === after ? [] : [{ year: yr, visitorsAhead: after, value: visitors[i + 1]! }];
  });

  const step = width < 520 ? 20 : 10;
  const decades = years.filter((yr) => yr % step === 0);
  const fi = years.indexOf(focused);

  const pick = (clientX: number, el: SVGRectElement) => {
    const box = el.getBoundingClientRect();
    const yr = Math.round(x.invert(clientX - box.left + M.left));
    onFocus(Math.min(last, Math.max(first, yr)));
  };

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="訪日外客数と出国日本人数の推移" className="block">
          {y.ticks(5).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tickMan(t)}
              </text>
            </g>
          ))}
          {decades.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={height - M.bottom + 16}
              textAnchor="middle"
              className="tnum fill-muted text-[10.5px]"
            >
              {yr}
            </text>
          ))}

          {fi >= 0 && (
            <line
              x1={x(focused)}
              x2={x(focused)}
              y1={M.top}
              y2={height - M.bottom}
              className="stroke-ink/25"
              strokeDasharray="2 3"
            />
          )}

          <path d={path(outbound)} fill="none" stroke={OUTBOUND_COLOR} strokeWidth={1.5} />
          <path d={path(visitors)} fill="none" stroke={VISITORS_COLOR} strokeWidth={2.25} />

          {crossings.map((c) => (
            <g key={c.year} transform={`translate(${x(c.year)},${y(c.value)})`}>
              <circle r={3.5} className="fill-paper" stroke={VISITORS_COLOR} strokeWidth={1.5} />
              <text y={-9} textAnchor="middle" className="tnum fill-muted text-[10px]">
                {c.year}
              </text>
            </g>
          ))}

          {fi >= 0 && (
            <>
              <circle cx={x(focused)} cy={y(outbound[fi]!)} r={3} fill={OUTBOUND_COLOR} />
              <circle cx={x(focused)} cy={y(visitors[fi]!)} r={3.5} fill={VISITORS_COLOR} />
            </>
          )}

          <text x={x(last) + 6} y={y(visitors.at(-1)!)} dy="0.32em" className="fill-ink text-[11px] font-semibold">
            訪日外客
          </text>
          <text x={x(last) + 6} y={y(outbound.at(-1)!)} dy="0.32em" className="fill-muted text-[11px]">
            出国日本人
          </text>

          <rect
            x={M.left}
            y={M.top}
            width={Math.max(0, x(last) - M.left)}
            height={height - M.top - M.bottom}
            className="cursor-crosshair fill-transparent"
            onPointerMove={(e) => e.pointerType === "mouse" && pick(e.clientX, e.currentTarget)}
            onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          />
        </svg>
      )}
    </div>
  );
}
