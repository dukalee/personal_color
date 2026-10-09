import { describe, expect, it } from 'vitest';
import { OUTFIT_COUNT, buildOutfitPlan } from './outfits';
import { SEASON_KEYS } from '../../types';

const FEMININE_KO = ['원피스', '스커트', '펌프스', '슬링백', '이어링', '숄더백', '플랫', '네크라인'];
const FEMININE_EN = ['dress', 'skirt', 'pumps', 'slingback', 'earrings', 'handbag', 'shoulder bag', 'flats', 'womenswear'];

describe('성별별 스타일링 구성', () => {
  it.each(SEASON_KEYS)('%s: 남성 룩에는 여성용 아이템이 없다', (season) => {
    for (let i = 0; i < OUTFIT_COUNT; i++) {
      const plan = buildOutfitPlan(season, i, 'male');
      const ko = [plan.title, ...plan.pieces.map((p) => p.text)].join(' ');
      FEMININE_KO.forEach((w) => expect(ko, `${season} #${i} 한글: ${w}`).not.toContain(w));

      // 프롬프트에서 '금지' 문구를 제외한 부분(의상 지시)만 검사한다
      const outfitLine = plan.prompt.split('\n').find((l) => l.startsWith('Outfit')) ?? '';
      FEMININE_EN.forEach((w) => expect(outfitLine.toLowerCase(), `${season} #${i} 영문: ${w}`).not.toContain(w));
      expect(plan.prompt).toContain('menswear');
    }
  });

  it.each(SEASON_KEYS)('%s: 여성 프롬프트는 womenswear 로 지정한다', (season) => {
    for (let i = 0; i < OUTFIT_COUNT; i++) {
      expect(buildOutfitPlan(season, i, 'female').prompt).toContain('womenswear');
    }
  });

  it('룩은 성별과 관계없이 항상 OUTFIT_COUNT 개이며 서로 제목이 다르다', () => {
    for (const g of ['male', 'female'] as const) {
      const titles = Array.from({ length: OUTFIT_COUNT }, (_, i) => buildOutfitPlan('summer', i, g).title);
      expect(new Set(titles).size).toBe(OUTFIT_COUNT);
    }
  });
});
