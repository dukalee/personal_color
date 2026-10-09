import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { SEASONS } from '../lib/seasons';
import { THEMES } from '../lib/theme';
import { buildOutfitPlan } from '../lib/openai/outfits';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from './slideSize';
import type { Analysis, ColorSwatch, Combo, Gender, OutfitState, Reliability, SeasonKey } from '../types';

// 지표별 단계 (왼쪽 → 오른쪽). 값이 해당 단계에 있으면 강조한다.
const METRICS: { label: string; key: 'undertone' | 'brightness' | 'saturation' | 'contrast'; steps: string[] }[] = [
  { label: '언더톤', key: 'undertone', steps: ['웜', '중립', '쿨'] },
  { label: '명도', key: 'brightness', steps: ['어두움', '중간', '밝음'] },
  { label: '채도', key: 'saturation', steps: ['저채도', '중간', '고채도'] },
  { label: '대비', key: 'contrast', steps: ['낮음', '높음'] },
];

/** 계절 테마(CSS 변수)를 적용하는 래퍼 */
export const ThemeWrap = forwardRef<HTMLDivElement, { season: SeasonKey; className?: string; children: ReactNode }>(
  function ThemeWrap({ season, className, children }, ref) {
    const t = THEMES[season];
    const vars = {
      '--bg': t.bg,
      '--card': t.card,
      '--ink': t.ink,
      '--muted': t.muted,
      '--accent': t.accent,
      '--soft': t.soft,
      '--line': t.line,
      width: SLIDE_WIDTH,
    } as CSSProperties;
    return <div ref={ref} className={className} style={vars}>{children}</div>;
  },
);

function Slide({ children }: { children: ReactNode }) {
  return <section className="slide" style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}>{children}</section>;
}

function SlideHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <header className="s-head">
      <span className="s-no">{no}</span>
      <h2>{title}</h2>
      {sub && <span className="s-headsub">{sub}</span>}
    </header>
  );
}

function Swatch({ color, avoid }: { color: ColorSwatch; avoid?: boolean }) {
  return (
    <li className="s-tile">
      <span className="s-tile-swatch" style={{ background: color.hex }}>
        {avoid && <span className="s-x">✕</span>}
      </span>
      <span className="s-tile-name">{color.name}</span>
      <span className="s-tile-hex">{color.hex.toUpperCase()}</span>
    </li>
  );
}

function Dots({ colors, small }: { colors: ColorSwatch[]; small?: boolean }) {
  return (
    <span className={small ? 'dots dots-sm' : 'dots'}>
      {colors.map((c) => <i key={c.hex} style={{ background: c.hex }} />)}
    </span>
  );
}

/* ---------- 1. 요약 ---------- */
interface IntroProps {
  season: SeasonKey;
  analysis: Analysis;
  tone: string;
  reliability: Reliability;
  photoUrl: string;
}

export function IntroSlide({ season, analysis, tone, reliability, photoUrl }: IntroProps) {
  const data = SEASONS[season];
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <Slide>
      <h1 className="s-title">
        <span className="spark">✦</span> Personal Color Report <span className="spark">✦</span>
      </h1>

      <div className="s-intro">
        <img className="s-photo" src={photoUrl} alt="진단 사진" />
        <div className="s-result">
          <div className="s-ribbon">당신의 퍼스널 컬러는</div>
          <div className="s-label">{data.label}</div>
          <div className="s-subtone">세부 톤 · {tone}</div>
          <p className="s-tagline">{data.tagline}</p>
          <ul className="s-keywords">
            {data.keywords.map((k) => <li key={k}>{k}</li>)}
          </ul>
        </div>
      </div>

      <div className="s-metrics">
        {METRICS.map((m) => (
          <div className="metric" key={m.key}>
            <span className="metric-label">{m.label}</span>
            <strong className="metric-value">{analysis[m.key]}</strong>
            <span className="metric-steps">
              {m.steps.map((step) => <i key={step} className={step === analysis[m.key] ? 'on' : ''} />)}
            </span>
          </div>
        ))}
      </div>

      <div className="s-review">
        <span className="ico-check">✓</span>
        <p>{analysis.review}</p>
      </div>

      <footer className="s-foot">
        <span>{today}</span>
        <span>
          진단 신뢰도 {reliability.level}
          {reliability.issues.length > 0 && ` (${reliability.issues.join(', ')})`}
        </span>
        <span>조명·보정에 따라 결과가 달라질 수 있어요</span>
      </footer>
    </Slide>
  );
}

/* ---------- 2·3. 어울리는 색 / 피해야 하는 색 ---------- */
function ComboCard({ combo, pool, best, avoid }: { combo: Combo; pool: ColorSwatch[]; best: ColorSwatch[]; avoid?: boolean }) {
  const pair = combo.use.map((i) => pool[i]);
  return (
    <div className="combo">
      <div className="combo-top">
        <Dots colors={pair} />
        <strong>{pair.map((c) => c.name).join(' + ')}</strong>
      </div>
      <p>{combo.note}</p>
      {avoid && combo.swap && (
        <div className="combo-swap">
          <span>대신</span>
          <Dots colors={combo.swap.map((i) => best[i])} small />
          <b>{combo.swap.map((i) => best[i].name).join(' + ')}</b>
        </div>
      )}
    </div>
  );
}

export function PaletteSlide({ season, kind }: { season: SeasonKey; kind: 'best' | 'avoid' }) {
  const data = SEASONS[season];
  const avoid = kind === 'avoid';
  const colors = avoid ? data.worst : data.best;
  const combos = avoid ? data.combos.avoid : data.combos.best;
  return (
    <Slide>
      <SlideHead
        no={avoid ? '03' : '02'}
        title={avoid ? '피해야 하는 색 5가지' : '어울리는 색 5가지'}
        sub={avoid ? data.avoid_note : data.suits}
      />
      <ul className="s-swatches">
        {colors.map((c) => <Swatch key={c.hex} color={c} avoid={avoid} />)}
      </ul>
      <h3 className="s-sub">{avoid ? '피해야 할 컬러 조합' : '추천 컬러 조합'}</h3>
      <div className="s-combos">
        {combos.map((c) => (
          <ComboCard key={c.use.join('-')} combo={c} pool={colors} best={data.best} avoid={avoid} />
        ))}
      </div>
    </Slide>
  );
}

/* ---------- 4~6. 추천 스타일링 ---------- */
export function LookSlide({
  season,
  index,
  gender,
  outfit,
}: {
  season: SeasonKey;
  index: number;
  gender: Gender;
  outfit: OutfitState;
}) {
  const plan = buildOutfitPlan(season, index, gender);
  return (
    <Slide>
      <SlideHead no={String(index + 4).padStart(2, '0')} title={`추천 스타일링 ${index + 1}`} sub={plan.title} />
      <div className="s-look">
        {outfit.status === 'done' ? (
          <img className="s-look-img" src={outfit.dataUrl} alt={plan.title} />
        ) : (
          <div className="s-look-img s-look-empty">
            {outfit.status === 'error' ? (
              <span className="s-look-error">
                <b>생성 실패</b>
                {outfit.message}
              </span>
            ) : (
              '생성 중...'
            )}
          </div>
        )}
        <div className="s-look-info">
          <div className="s-look-no">LOOK {String(index + 1).padStart(2, '0')}</div>
          <h3>{plan.title}</h3>
          <div className="s-look-colors">
            {plan.colors.map((c) => (
              <span key={c.hex}><i style={{ background: c.hex }} />{c.name} {c.hex.toUpperCase()}</span>
            ))}
          </div>
          <dl>
            {plan.pieces.map((p) => (
              <div key={p.label}>
                <dt>{p.label}</dt>
                <dd>{p.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Slide>
  );
}
