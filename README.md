# 日本には、どれだけの外国人が訪れてきたか

JNTO「訪日外客統計」をもとに、訪日外客数を時代／国・地域／目的の3つの切り口で探索するダッシュボード。

- 想定URL: https://japan-foreigners-visitors.visualizing.jp/
- シリーズ: [日本にいる外国人は、どこから来たか](https://japan-foreigners.visualizing.jp/)（`../japan-foreigners/`）

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

## 開発

```bash
brew install poppler   # PDF の読み取りに pdftotext を使う
npm install
npm run fetch && npm run normalize && npm run data && npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | JNTO のページから3表を `data/raw/` へ（`-- --force` で取り直し） |
| `npm run normalize` | 正規化 JSON を `data/normalized/` へ |
| `npm run data` | 配信用 JSON を `public/data/` へ |
| `npm run verify` | 3表の突き合わせ |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## ビュー

- **時代** — 訪日外客数と出国日本人数（1964–）、月別の推移と季節
- **国・地域** — 年ごとの順位と、上位の構成の推移、選んだ国の月別
- **目的** — 観光・商用・その他の構成（2004–）

## デプロイ

`main` への push で GitHub Pages にデプロイ（`.github/workflows/pages.yml`）。カスタムドメインは `public/CNAME`。
