import { useState } from 'react';
import { ReportPreview } from './ReportPreview';
import { IntroSlide, LookSlide, PaletteSlide, ThemeWrap } from './slides';
import { OUTFIT_COUNT } from '../lib/openai/outfits';
import type { Analysis, Gender, OutfitState, Reliability, SeasonKey } from '../types';

interface Props {
  season: SeasonKey;
  analysis: Analysis;
  tone: string;
  reliability: Reliability;
  photoUrl: string;
  outfits: OutfitState[];
  gender: Gender;
}

// 요약 · 어울리는 색 · 피해야 하는 색 · 스타일링 × OUTFIT_COUNT
const PAGE_COUNT = 3 + OUTFIT_COUNT;

export function Deck({ season, analysis, tone, reliability, photoUrl, outfits, gender }: Props) {
  const [page, setPage] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  const go = (p: number) => setPage(Math.max(0, Math.min(PAGE_COUNT - 1, p)));

  const renderSlide = (p: number) => {
    if (p === 0) return <IntroSlide season={season} analysis={analysis} tone={tone} reliability={reliability} photoUrl={photoUrl} />;
    if (p === 1) return <PaletteSlide season={season} kind="best" />;
    if (p === 2) return <PaletteSlide season={season} kind="avoid" />;
    const i = p - 3;
    return <LookSlide season={season} index={i} gender={gender} outfit={outfits[i] ?? { status: 'pending' }} />;
  };

  return (
    <section
      className="deck"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(page - 1);
        if (e.key === 'ArrowRight') go(page + 1);
      }}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1));
        setTouchX(null);
      }}
    >
      <div className="deck-stage">
        <button className="deck-arrow deck-arrow-left" onClick={() => go(page - 1)} disabled={page === 0} aria-label="이전 슬라이드">
          ‹
        </button>
        {/* key 를 주지 않는다: 페이지마다 새로 마운트하면 높이가 순간 0 이 되어 스크롤이 맨 위로 튄다 */}
        <ReportPreview>
          <ThemeWrap season={season}>{renderSlide(page)}</ThemeWrap>
        </ReportPreview>
        <button
          className="deck-arrow deck-arrow-right"
          onClick={() => go(page + 1)}
          disabled={page === PAGE_COUNT - 1}
          aria-label="다음 슬라이드"
        >
          ›
        </button>
      </div>
      <div className="deck-count">{page + 1} / {PAGE_COUNT}</div>
    </section>
  );
}
