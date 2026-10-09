export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];

// 스타일링 추천(의상 구성·이미지 프롬프트)에 사용하는, 사용자가 직접 선택한 성별
export type Gender = 'female' | 'male';

export interface ColorSwatch {
  name: string;
  hex: string;
}

// 컬러 조합: best/worst 배열의 인덱스로 참조한다 (컬러 값의 단일 출처 유지)
export interface Combo {
  use: [number, number];
  note: string;
  swap?: [number, number]; // 피해야 할 조합 대신 추천하는 best 인덱스
}

export interface SeasonData {
  label: string;
  tone: 'warm' | 'cool';
  summary: string;
  tagline: string;
  keywords: string[];
  tip: string;
  traits: { skin: string; eyes: string; hair: string; impression: string };
  suits: string;
  avoid_note: string;
  best: ColorSwatch[];
  worst: ColorSwatch[];
  combos: { best: Combo[]; avoid: Combo[] };
}

// 의상 한 벌의 구성: 화면 설명(잡지 스타일)과 이미지 프롬프트를 함께 만든다
export interface OutfitPiece {
  label: string;
  text: string;
}

export interface OutfitPlan {
  title: string;
  colors: ColorSwatch[];
  pieces: OutfitPiece[];
  prompt: string;
}

export type OutfitState =
  | { status: 'pending' }
  | { status: 'done'; dataUrl: string }
  | { status: 'error'; message: string };

export interface PreparedPhoto {
  file: File;
  dataUrl: string;
}

// 진단 결과의 판단 기준 4가지 (리포트의 '특징 분석')와 근거 문장 (리포트의 '총평')
export interface Analysis {
  undertone: string;
  brightness: string;
  saturation: string;
  contrast: string;
  review: string;
}

// 조명·필터·화장 등으로 인한 결과 신뢰도
export interface Reliability {
  level: string;
  issues: string[];
}
