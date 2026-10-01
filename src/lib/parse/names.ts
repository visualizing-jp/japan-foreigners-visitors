/**
 * 表どうしで名前を揃える。
 *
 * 月別 Excel は州を「アジア計」、目的別 PDF は「アジア」と書く。
 * 「無国籍・その他」は表によって中黒が全角・半角に揺れる。内訳の行頭には全角空白が入る。
 */

export const TOTAL = "総数";

/**
 * 月別 Excel ではオセアニア計の直後に「計」なしで並ぶが、オセアニアの内訳ではない。
 * 目的別 PDF では州と同じ字下げで置かれている。
 */
export const UNAFFILIATED = "無国籍・その他";

export function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\s\u3000]+/g, "")
    .replace(/･/g, "・");
}

/** 州の行なら「計」を落とした名前、そうでなければ null。 */
export function regionName(name: string): string | null {
  if (name === UNAFFILIATED) return name;
  return name !== TOTAL && name.endsWith("計") ? name.slice(0, -1) : null;
}
