import { describe, expect, it } from 'vitest';
import { SEASONS } from './seasons';
import { SEASON_KEYS } from '../types';

describe('seasons.json', () => {
  it.each(SEASON_KEYS)('%s: 추천/회피 컬러가 각 5개이고 HEX 형식이 올바르다', (key) => {
    const s = SEASONS[key];
    expect(s.best).toHaveLength(5);
    expect(s.worst).toHaveLength(5);
    expect(s.keywords).toHaveLength(4);
    expect(s.combos.best).toHaveLength(3);
    expect(s.combos.avoid).toHaveLength(3);
    for (const c of s.combos.best) c.use.forEach((i) => expect(s.best[i]).toBeDefined());
    for (const c of s.combos.avoid) {
      c.use.forEach((i) => expect(s.worst[i]).toBeDefined());
      c.swap?.forEach((i) => expect(s.best[i]).toBeDefined());
    }
    expect(s.tagline.length).toBeGreaterThan(0);
    expect(s.tip.length).toBeGreaterThan(0);
    for (const c of [...s.best, ...s.worst]) {
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});
