/**
 * 正規化 JSON（data/normalized）の形。表の行をそのまま写し、集計し直さない。
 *
 * level: 0 総数 / 1 州（アジア計など）/ 2 国・地域 / 3 その内訳（中東地域・北欧地域の内側）。
 */

export type Level = 0 | 1 | 2 | 3;

export interface TableRow {
  name: string;
  level: Level;
  /** 直上の行の名前。総数は null。 */
  parent: string | null;
}

export interface AnnualRow {
  year: number;
  visitors: number;
  outbound: number;
}

export interface MonthlyRow extends TableRow {
  months: (number | null)[];
  /** 斜体（推計値）の月。0 始まり。 */
  estimated: number[];
  /** 表の「累計」列。年の途中なら公表済みの月までの累計。 */
  cumulative: number | null;
}

export interface MonthlyYear {
  year: number;
  /** シート末尾の「注２」。確定値か、斜体が推計値かを表が自分で宣言している。 */
  note: string;
  definitive: boolean;
  rows: MonthlyRow[];
}

export interface PurposeRow extends TableRow {
  total: number;
  /** 目的 → 人数。その年の表にある目的だけ。 */
  values: Record<string, number>;
}

export interface PurposeYear {
  year: number;
  /** 見出しの並び順の目的。年によって「一時上陸客」の列がある。 */
  categories: string[];
  rows: PurposeRow[];
}
