import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { MarketsView } from "./views/MarketsView.tsx";
import { PurposeView } from "./views/PurposeView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { SeriesBar, SeriesFooter } from "./components/Brand.tsx";

const VIEWS = [
  { id: "era", label: "時代", hint: "1964–" },
  { id: "markets", label: "国・地域", hint: "2003–" },
  { id: "purpose", label: "目的", hint: "2004–" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) => VIEWS.some((x) => x.id === v));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <SeriesBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div className="pb-2">
            <h1 className="text-[15px] font-semibold tracking-tight">日本には、どれだけの外国人が訪れてきたか</h1>
            <p className="text-[11px] text-muted">日本政府観光局（JNTO）「訪日外客統計」</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                  view === v.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "markets" && <MarketsView />}
        {view === "purpose" && <PurposeView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 日本政府観光局（JNTO）「訪日外客統計」の「国籍/月別 訪日外客数」「国籍/目的別 訪日外客数」「年別 訪日外客数、出国日本人数の推移」。
        訪日外客は、法務省集計の外国人正規入国者から日本を主たる居住国とする永住者等を除き、寄港地上陸・通過上陸・船舶観光上陸の外国人を加えた数。
        駐在員とその家族、留学生などの入国・再入国を含み、乗員を含まない。観光客そのものではない（目的別の内訳は「目的」を参照）。
        3表は互いに突き合わせて一致を確かめている。
        <SeriesFooter />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
