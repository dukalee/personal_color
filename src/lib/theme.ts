import type { SeasonKey } from '../types';

export interface ReportTheme {
  bg: string; // 리포트 바탕
  card: string; // 카드 바탕
  ink: string; // 제목·본문
  muted: string; // 보조 텍스트
  accent: string; // 진단 결과 강조색
  soft: string; // 리본·키워드·섹션 헤더 배경
  line: string; // 카드 테두리
}

// 리포트 전체 색감은 진단된 계절의 팔레트에 맞춘다
export const THEMES: Record<SeasonKey, ReportTheme> = {
  spring: { bg: '#FFF9F0', card: '#FFFEFB', ink: '#5A3E2B', muted: '#8A7664', accent: '#E8894A', soft: '#FCE9D4', line: '#F1DCC2' },
  summer: { bg: '#FAF9FD', card: '#FFFFFF', ink: '#2E2A63', muted: '#6F6A8E', accent: '#9A86C9', soft: '#E9E3F6', line: '#D9D2EC' },
  autumn: { bg: '#FBF6EE', card: '#FFFCF7', ink: '#4A2A1C', muted: '#7C6552', accent: '#B5642E', soft: '#F0DFC8', line: '#E2D3BC' },
  winter: { bg: '#F7F6FB', card: '#FFFFFF', ink: '#14183C', muted: '#5F6385', accent: '#B0126E', soft: '#E7E3F1', line: '#D4D0E4' },
};
