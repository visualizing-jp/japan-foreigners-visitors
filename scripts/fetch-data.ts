/**
 * JNTO のページからリンクを拾い、3表を data/raw/ に落とす。
 * 既にあるファイルは取り直さない。月次の更新を取り込むときは --force。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PAGE_URL, TABLES, type TableId } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

export function rawPath(table: TableId): string {
  return resolve(RAW_DIR, `${table}.${TABLES[table].format}`);
}

export const SOURCE_PATH = resolve(RAW_DIR, "source.json");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** リンク文字列が label で始まり、拡張子が format の最初のリンク。 */
function findLink(html: string, label: string, format: string): string {
  for (const m of html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)/g)) {
    const [, href, text] = m;
    if (href!.endsWith(`.${format}`) && text!.replace(/\s+/g, " ").trim().startsWith(label)) {
      return new URL(href!, PAGE_URL).href;
    }
  }
  throw new Error(`「${label}」の .${format} がページにない: ${PAGE_URL}`);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const res = await fetch(PAGE_URL);
  if (!res.ok) throw new Error(`${res.status} ${PAGE_URL}`);
  const html = await res.text();

  await mkdir(RAW_DIR, { recursive: true });
  const urls: Record<string, string> = {};
  for (const [table, { label, format }] of Object.entries(TABLES)) {
    const url = findLink(html, label, format);
    urls[table] = url;
    const path = rawPath(table as TableId);
    if (!force && (await exists(path))) continue;
    const file = await fetch(url);
    if (!file.ok) throw new Error(`${table}: ${file.status} ${url}`);
    await writeFile(path, Buffer.from(await file.arrayBuffer()));
    console.log(`  ${table}.${format}  ${url}`);
  }
  await writeFile(SOURCE_PATH, `${JSON.stringify({ page: PAGE_URL, urls }, null, 1)}\n`);
}

if (import.meta.main) await main();
