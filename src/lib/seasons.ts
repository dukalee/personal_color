import raw from '../../data/seasons.json';
import type { SeasonData, SeasonKey } from '../types';

// data/seasons.json 이 컬러·유형 정보의 단일 출처다.
export const SEASONS = raw as Record<SeasonKey, SeasonData>;
