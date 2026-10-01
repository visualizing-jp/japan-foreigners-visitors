/**
 * JNTO「訪日外客統計」ページから取る表。
 *
 * ファイル名は公表日つき（20260916_1615-5.xlsx など）で毎月変わるので、URL は固定しない。
 * ページのリンク文字列と拡張子で探す。国籍/月別は Excel、ほかの2表は PDF しか配っていない。
 */

export const PAGE_URL = "https://www.jnto.go.jp/statistics/data/visitors-statistics/";

export type TableId = "monthly" | "purpose" | "annual";

export const TABLES: Record<TableId, { label: string; format: "xlsx" | "pdf" }> = {
  monthly: { label: "国籍/月別 訪日外客数", format: "xlsx" },
  purpose: { label: "国籍/目的別 訪日外客数", format: "pdf" },
  annual: { label: "年別", format: "pdf" },
};
