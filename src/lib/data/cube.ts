/**
 * 配信データ（public/data/*.json）の形。build.ts が書き、画面が読む。
 *
 * 国・地域は年によって表の階層が変わる（イスラエルは2019年までアジア直下、2020年から中東地域の内訳）。
 * そこで行の名前を軸にし、階層は年ごとに持つ。null はその年の表にない行。
 */

export type Level = 0 | 1 | 2 | 3;

export interface EraJson {
  annual: { years: number[]; visitors: number[]; outbound: number[] };
  /** 2003年1月からの月別の総数。 */
  monthly: { start: number; values: (number | null)[]; estimated: number[] };
  /** 年別の表の最終年。これより後は年の確定値が出ていない。 */
  confirmedThrough: number;
}

export interface MarketsJson {
  years: number[];
  definitive: boolean[];
  /** 年ごとの、総数が公表済みの月数。 */
  months: number[];
  names: string[];
  /** names × years。 */
  levels: (Level | null)[][];
  parents: (string | null)[][];
  /** names × years。表の累計列（年の途中なら公表済みの月まで）。 */
  annual: (number | null)[][];
  /** names × (years × 12)。 */
  monthly: (number | null)[][];
  /** names × 推計の月の通し番号。 */
  estimated: number[][];
}

export interface PurposeJson {
  years: number[];
  categories: string[];
  names: string[];
  levels: (Level | null)[][];
  parents: (string | null)[][];
  total: (number | null)[][];
  /** categories × names × years。その年の表にない目的は null。 */
  values: (number | null)[][][];
}
