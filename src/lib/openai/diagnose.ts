import type OpenAI from 'openai';
import type { Analysis, Gender, Reliability, SeasonKey } from '../../types';
import { VISION_MODEL } from './client';

export type DiagnosisOutcome =
  | { faceDetected: false; reason: string }
  | { faceDetected: true; season: SeasonKey; tone: string; analysis: Analysis; reliability: Reliability };

// 진단 지침 (그대로 전달한다)
const SYSTEM_PROMPT = `당신은 퍼스널 컬러 진단 전문가입니다. 사용자가 보낸 얼굴 사진을 보고 4계절 12톤 체계에 따라 퍼스널 컬러를 판단합니다.

[판단 기준]
1. 언더톤: 피부 바탕색이 웜(황색/골든 기운)인지 쿨(핑크/푸른 기운)인지
2. 명도: 피부, 머리카락, 눈동자의 전반적인 밝기 (밝음 / 중간 / 어두움)
3. 채도: 색이 선명하고 맑은지(고채도), 부드럽고 탁한지(저채도)
4. 대비: 피부-머리카락-눈동자 사이의 명암 차이 (높음 / 낮음)

[관찰 대상]
- 피부톤 (볼, 이마 중심. 입술·눈썹 화장 영향은 배제)
- 머리카락 색 (염색 여부가 보이면 반영하지 말고 언급)
- 눈동자 색
- 혈관, 홍조 등이 보이면 참고

[분류 체계]
- 봄 웜: 라이트 / 브라이트 / 트루
- 여름 쿨: 라이트 / 뮤트 / 트루
- 가을 웜: 뮤트 / 딥 / 트루
- 겨울 쿨: 브라이트 / 딥 / 트루

[주의사항]
- 사진의 조명, 필터, 보정, 화이트밸런스, 화장이 결과를 왜곡할 수 있습니다. 왜곡 요인이 보이면 반드시 reliability에 반영하세요.
- 사진만으로 확정할 수 없는 경우 확신하는 척하지 말고, 후보를 2개까지 제시하세요.
- 얼굴이 보이지 않거나 판단이 불가능하면 diagnosable을 false로 하고 이유를 쓰세요.
- 외모에 대한 평가나 우열 표현은 하지 마세요. 색 분석만 합니다.
- 반드시 아래 JSON 형식으로만 답하고, JSON 외의 텍스트는 출력하지 마세요.`;

const USER_PROMPT = `이 사진의 퍼스널 컬러를 진단해 주세요. 아래 JSON 형식으로만 답하세요.

{
  "diagnosable": true,
  "season": "봄|여름|가을|겨울",
  "tone": "예: 가을 뮤트",
  "alternative": "차선 후보 (없으면 null)",
  "analysis": {
    "undertone": "웜|쿨|중립",
    "brightness": "밝음|중간|어두움",
    "saturation": "고채도|중간|저채도",
    "contrast": "높음|낮음"
  },
  "reasoning": "위 판단의 근거를 사진에서 관찰한 내용 중심으로 2~3문장",
  "best_colors": ["#hex", "#hex", "#hex", "#hex", "#hex"],
  "avoid_colors": ["#hex", "#hex", "#hex"],
  "reliability": {
    "level": "높음|중간|낮음",
    "issues": ["조명 노란기", "필터 의심", "화장 짙음" 등]
  }
}

diagnosable이 false이면 reasoning에 판단 불가 이유를 쓰고 나머지 값은 비워 두세요.`;

const SEASON_BY_KOREAN: Record<string, SeasonKey> = {
  봄: 'spring',
  여름: 'summer',
  가을: 'autumn',
  겨울: 'winter',
};

const nullableString = { type: ['string', 'null'] } as const;

// 위 JSON 형식을 그대로 강제하는 스키마 (diagnosable=false 일 때를 위해 값은 null 허용)
const SCHEMA = {
  type: 'object',
  properties: {
    diagnosable: { type: 'boolean' },
    season: { type: ['string', 'null'], enum: ['봄', '여름', '가을', '겨울', null] },
    tone: nullableString,
    alternative: nullableString,
    analysis: {
      type: 'object',
      properties: {
        undertone: { type: ['string', 'null'], enum: ['웜', '쿨', '중립', null] },
        brightness: { type: ['string', 'null'], enum: ['밝음', '중간', '어두움', null] },
        saturation: { type: ['string', 'null'], enum: ['고채도', '중간', '저채도', null] },
        contrast: { type: ['string', 'null'], enum: ['높음', '낮음', null] },
      },
      required: ['undertone', 'brightness', 'saturation', 'contrast'],
      additionalProperties: false,
    },
    reasoning: { type: 'string' },
    best_colors: { type: 'array', items: { type: 'string' } },
    avoid_colors: { type: 'array', items: { type: 'string' } },
    reliability: {
      type: 'object',
      properties: {
        level: { type: ['string', 'null'], enum: ['높음', '중간', '낮음', null] },
        issues: { type: 'array', items: { type: 'string' } },
      },
      required: ['level', 'issues'],
      additionalProperties: false,
    },
  },
  required: ['diagnosable', 'season', 'tone', 'alternative', 'analysis', 'reasoning', 'best_colors', 'avoid_colors', 'reliability'],
  additionalProperties: false,
} as const;

interface RawDiagnosis {
  diagnosable: boolean;
  season: string | null;
  tone: string | null;
  alternative: string | null;
  analysis: {
    undertone: string | null;
    brightness: string | null;
    saturation: string | null;
    contrast: string | null;
  };
  reasoning: string;
  reliability: { level: string | null; issues: string[] };
}

export async function diagnose(client: OpenAI, imageDataUrl: string, gender: Gender): Promise<DiagnosisOutcome> {
  // 사용자가 직접 선택한 성별을 참고 정보로 전달한다 (색 판단은 사진 기준)
  const genderNote = `\n\n참고: 사용자가 직접 선택한 성별은 ${gender === 'male' ? '남성' : '여성'}입니다. 화장·염색 여부를 판단할 때만 참고하고, 색 분석 자체는 사진 기준으로 하세요.`;
  const res = await client.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT + genderNote },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'personal_color_diagnosis', strict: true, schema: SCHEMA },
    },
  });

  const message = res.choices[0]?.message;
  if (!message || message.refusal || !message.content) {
    throw new Error('사진을 분석할 수 없었습니다. 얼굴이 잘 보이는 다른 사진으로 시도해주세요.');
  }

  const raw = JSON.parse(message.content) as RawDiagnosis;
  // 4계절 enum 밖의 값이면 판단 불가로 처리한다
  const season = raw.season ? SEASON_BY_KOREAN[raw.season] : undefined;
  if (!raw.diagnosable || !season) return { faceDetected: false, reason: raw.reasoning };

  const a = raw.analysis;
  return {
    faceDetected: true,
    season,
    tone: raw.tone ?? raw.season ?? '',
    analysis: {
      undertone: a.undertone ?? '-',
      brightness: a.brightness ?? '-',
      saturation: a.saturation ?? '-',
      contrast: a.contrast ?? '-',
      review: raw.reasoning,
    },
    reliability: { level: raw.reliability.level ?? '중간', issues: raw.reliability.issues },
  };
}
