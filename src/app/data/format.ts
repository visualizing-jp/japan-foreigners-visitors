const int = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 10万人以上は万人に丸める。それより小さい国は桁が消えるので人で出す。 */
export function people(n: number): string {
  return n >= 100_000 ? `${int.format(Math.round(n / 10_000))}万人` : `${int.format(n)}人`;
}

export function exact(n: number): string {
  return `${int.format(n)}人`;
}

export function pct(share: number): string {
  return `${one.format(share * 100)}%`;
}

/** 軸の目盛り。0 以外は万人単位。 */
export function tickMan(v: number): string {
  return v === 0 ? "0" : `${int.format(v / 10_000)}万`;
}

/** 通し番号（start 年1月 = 0）→ 年・月。 */
export function monthOf(index: number, start: number): { year: number; month: number } {
  return { year: start + Math.floor(index / 12), month: (index % 12) + 1 };
}

/** 年の途中なら「1–8月」を添える。 */
export function yearLabel(year: number, months: number): string {
  return months === 12 ? `${year}年` : `${year}年 1–${months}月`;
}
