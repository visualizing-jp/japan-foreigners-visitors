/**
 * 系列の色。地の紙に沈まない程度に彩度を落とした8色。
 * 順位の色は「上位◯か国」の並びに固定して使い、年を変えても同じ国が同じ色になるようにする。
 */

export const RANK_COLORS = [
  "#b0392a",
  "#2f5d8a",
  "#c9893a",
  "#4f7d5c",
  "#7a5a8c",
  "#3f8f8f",
  "#a0606a",
  "#7b7a3a",
];

/** 上位に入らない国をまとめた残り。 */
export const REST_COLOR = "#d9d4ca";

/** 一覧から選んだ、上位に入らない国。 */
export const PICK_COLOR = "#16140f";

export const PURPOSE_COLORS: Record<string, string> = {
  観光客: "#b0392a",
  商用客: "#2f5d8a",
  その他客: "#c9893a",
  一時上陸客: "#a8a299",
};

export const VISITORS_COLOR = "#b0392a";
export const OUTBOUND_COLOR = "#6d675d";
