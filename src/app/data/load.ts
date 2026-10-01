/**
 * 配信データの取得。同じファイルは一度しか取りに行かない。
 */

import type { EraJson, MarketsJson, PurposeJson } from "../../lib/data/cube.ts";

const cache = new Map<string, Promise<unknown>>();

function load<T>(name: string): Promise<T> {
  const hit = cache.get(name);
  if (hit !== undefined) return hit as Promise<T>;
  const promise = fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`${name}.json の取得に失敗しました (${r.status})`);
    return r.json() as Promise<T>;
  });
  cache.set(name, promise);
  return promise;
}

export const loadEra = () => load<EraJson>("era");
export const loadMarkets = () => load<MarketsJson>("markets");
export const loadPurpose = () => load<PurposeJson>("purpose");
