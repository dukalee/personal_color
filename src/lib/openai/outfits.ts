import type OpenAI from 'openai';
import { SEASONS } from '../seasons';
import type { ColorSwatch, Gender, OutfitPlan, OutfitPiece, PreparedPhoto, SeasonKey } from '../../types';
import { IMAGE_MODEL, VISION_MODEL } from './client';
import { padForFullBody } from '../padPhoto';

export const OUTFIT_COUNT = 2; // 로딩 시간을 줄이기 위해 2개만 생성한다

interface Piece {
  ko: string; // 잡지 스타일 설명
  en: string; // 이미지 프롬프트용 설명
}

const label = (c: ColorSwatch) => `${c.name} (${c.hex})`;

// 이미지 프롬프트와 화면 설명을 한 곳에서 만들어 둘이 어긋나지 않게 한다.
// best[0]은 4계절 모두 무채색 계열의 베이스(아이보리/소프트 화이트/웜 베이지/퓨어 화이트)라 기본 이너·하의에 쓴다.
interface Look {
  title: string;
  colors: ColorSwatch[];
  top: Piece;
  bottom: Piece;
  shoes: Piece;
  accessory: Piece;
}

function buildPieces(season: SeasonKey, index: number, gender: Gender): Look {
  const { best, tone } = SEASONS[season];
  const [base, c1, c2, , c4] = best;
  const metal = tone === 'warm' ? { ko: '골드', en: 'gold' } : { ko: '실버', en: 'silver' };

  // 여성: 티셔츠 / 원피스
  const womenLooks: Look[] = [
    {
      title: '데일리 티셔츠 룩',
      colors: [base, c1],
      top: {
        ko: `${base.name} 컬러의 베이직 크루넥 티셔츠. 얼굴 가까이에서 피부 톤을 맑게 받쳐주는 데일리 필수템이에요.`,
        en: `a plain crew-neck t-shirt in ${label(base)}`,
      },
      bottom: {
        ko: `${c1.name} 스트레이트 팬츠로 가볍게 이어, 편안하면서도 단정한 실루엣을 완성해요.`,
        en: `straight-leg trousers in ${label(c1)}`,
      },
      shoes: {
        ko: `${base.name} 미니멀 스니커즈로 경쾌하게 마무리해요.`,
        en: `minimal sneakers in ${label(base)}`,
      },
      accessory: {
        ko: `가느다란 ${metal.ko} 체인 목걸이를 더해 은은한 포인트를 줘요.`,
        en: `a thin ${metal.en} chain necklace`,
      },
    },
    {
      title: '우아 원피스 룩',
      colors: [c4, base],
      top: {
        ko: `${c4.name} 컬러 랩 원피스. 브이넥 네크라인이 목선을 시원하게 열어줘요.`,
        en: `a short-sleeve V-neck wrap dress in ${label(c4)}`,
      },
      bottom: {
        ko: `무릎 아래로 떨어지는 미디 기장의 플레어 스커트가 우아한 실루엣을 완성해요.`,
        en: `the dress has a flared midi-length skirt that falls below the knee (same dress, no separate skirt)`,
      },
      shoes: {
        ko: `${base.name} 로우힐 펌프스로 단정하게 마무리해요.`,
        en: `low-heel pumps in ${label(base)}`,
      },
      accessory: {
        ko: `${base.name} 미니 숄더백과 ${metal.ko} 이어링으로 포인트를 더해요.`,
        en: `a small shoulder bag in ${label(base)} and ${metal.en} earrings`,
      },
    },
  ];

  // 남성: 티셔츠 / 자켓 (원피스·스커트·힐·이어링·여성용 가방은 추천하지 않는다)
  const menLooks: Look[] = [
    {
      title: '데일리 티셔츠 룩',
      colors: [base, c1],
      top: {
        ko: `${base.name} 컬러의 베이직 크루넥 티셔츠. 얼굴 가까이에서 피부 톤을 맑게 받쳐주는 데일리 필수템이에요.`,
        en: `a plain crew-neck t-shirt in ${label(base)}`,
      },
      bottom: {
        ko: `${c1.name} 스트레이트 치노 팬츠로 가볍게 이어, 편안하면서도 단정한 실루엣을 완성해요.`,
        en: `straight-leg chino trousers in ${label(c1)}`,
      },
      shoes: {
        ko: `${base.name} 미니멀 스니커즈로 경쾌하게 마무리해요.`,
        en: `minimal sneakers in ${label(base)}`,
      },
      accessory: {
        ko: `심플한 ${metal.ko} 시계로 은은한 포인트를 줘요.`,
        en: `a simple ${metal.en} wristwatch`,
      },
    },
    {
      title: '클래식 자켓 룩',
      colors: [c2, base],
      top: {
        ko: `${c2.name} 컬러의 클래식 블레이저에 ${base.name} 이너 티셔츠를 레이어드해 단정하고 도회적인 분위기를 연출해요.`,
        en: `a structured menswear blazer in ${label(c2)} over a plain tee in ${label(base)}`,
      },
      bottom: {
        ko: `${base.name} 슬랙스로 곧게 떨어지는 라인을 만들어요.`,
        en: `tailored trousers in ${label(base)}`,
      },
      shoes: {
        ko: `${base.name} 가죽 로퍼로 클래식하게 마무리합니다.`,
        en: `leather loafers in ${label(base)}`,
      },
      accessory: {
        ko: `${metal.ko} 버클의 심플한 가죽 벨트로 절제된 포인트를 더해요.`,
        en: `a simple leather belt with a ${metal.en} buckle`,
      },
    },
  ];

  return (gender === 'male' ? menLooks : womenLooks)[index];
}

export function buildOutfitPlan(season: SeasonKey, index: number, gender: Gender): OutfitPlan {
  const look = buildPieces(season, index, gender);
  const subject =
    gender === 'male'
      ? 'The person is a man: dress him ONLY in menswear (no dresses, skirts, heels, handbags or feminine accessories).'
      : 'The person is a woman: dress her in womenswear.';
  const pieces: OutfitPiece[] = [
    { label: '상의', text: look.top.ko },
    { label: '하의', text: look.bottom.ko },
    { label: '신발', text: look.shoes.ko },
    { label: '액세서리', text: look.accessory.ko },
  ];

  const prompt = `Full-length fashion photo of the exact same person as in the reference image.
${subject}
The face must be a faithful photographic match of the reference: same face shape, eyes, eyebrows, nose, lips, skin tone, hairstyle and hair color. Do not beautify, slim, age or restyle the face.
The ENTIRE body must be visible from the top of the head down to the shoes: both feet and shoes completely in frame, never cropped at the knees, ankles or feet, with a small empty margin above the head and below the feet.
Use a wide, pulled-back framing so the whole figure fits comfortably. Standing straight, facing the camera, relaxed natural pose.
Outfit - top: ${look.top.en}; bottom: ${look.bottom.en}; shoes: ${look.shoes.en}; accessories: ${look.accessory.en}.
Clean plain light studio background, soft even lighting, realistic body proportions, no text.`;

  return { title: look.title, colors: look.colors, pieces, prompt };
}

const MAX_ATTEMPTS = 4; // 서로 다른 전략으로 시도하는 최대 횟수
const PADDED_FROM_ATTEMPT = 2; // 이 시도부터는 사진을 세로 캔버스에 올려 몸이 들어갈 자리를 만들어 보낸다
const FACE_PASS_SCORE = 4; // 5점 만점
const MAX_API_RETRIES = 4; // 429/5xx/네트워크 오류 재시도 횟수 (지수 백오프)

const RETRY_NOTES = [
  '',
  ' IMPORTANT: Zoom out further so the head and both shoes are fully inside the frame with clear margins. Match the reference face exactly.',
  ' IMPORTANT: The reference photo sits at the top of a taller canvas. Paint the rest of the body below it, down to the shoes, so the whole figure is visible head to toe. Keep the face exactly as in the reference.',
  ' IMPORTANT: Full-length view only: show the complete figure from hair to shoes, far from the frame edges. Paint the body below the reference photo. Copy the reference face exactly without any change.',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusOf(e: unknown): number | undefined {
  return typeof (e as { status?: unknown })?.status === 'number' ? (e as { status: number }).status : undefined;
}

// 일시적인 오류(한도 초과·서버 오류·네트워크 끊김)만 재시도 대상이다
function isTransient(e: unknown): boolean {
  const status = statusOf(e);
  if (status !== undefined) return status === 408 || status === 409 || status === 429 || status >= 500;
  return /^APIConnection/.test((e as Error)?.name ?? '');
}

// 인증·권한 오류는 재시도해도 소용없으므로 즉시 알린다
const isAuthError = (e: unknown) => statusOf(e) === 401 || statusOf(e) === 403;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await fn();
    } catch (e) {
      if (n >= MAX_API_RETRIES || !isTransient(e)) throw e;
      await sleep(1500 * 2 ** n + Math.random() * 500);
    }
  }
}

async function judge<T>(
  client: OpenAI,
  name: string,
  schema: Record<string, unknown>,
  content: OpenAI.Chat.Completions.ChatCompletionContentPart[],
): Promise<T | null> {
  // 검사 호출이 실패하더라도 이미지 생성 자체를 실패시키지 않는다 (판정 불가 = null)
  try {
    const res = await withRetry(() =>
      client.chat.completions.create({
        model: VISION_MODEL,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      }),
    );
    const message = res.choices[0]?.message;
    if (!message || message.refusal || !message.content) return null;
    return JSON.parse(message.content) as T;
  } catch (e) {
    if (isAuthError(e)) throw e;
    console.warn(`${name}: 판정 호출 실패 (판정 불가로 처리)`, e);
    return null;
  }
}

// 머리 끝부터 신발(양발)까지 프레임 안에 모두 있는지 검사한다
// 판정할 수 없으면 null
async function isFullBody(client: OpenAI, imageUrl: string): Promise<boolean | null> {
  const r = await judge<{ full_body_visible: boolean }>(
    client,
    'full_body_check',
    {
      type: 'object',
      properties: { full_body_visible: { type: 'boolean' } },
      required: ['full_body_visible'],
      additionalProperties: false,
    },
    [
      {
        type: 'text',
        text: 'Check this photo. Answer true only if the top of the head AND both shoes/feet are completely visible inside the frame, with nothing cut off by any image edge. Otherwise answer false.',
      },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
    ],
  );
  return r === null ? null : r.full_body_visible;
}

// 원본 사진과 생성 이미지의 얼굴 특징 유사도(1~5). 판정이 거부되면 null (사람을 식별하지 않고 특징만 비교)
async function faceSimilarity(client: OpenAI, referenceUrl: string, generatedUrl: string): Promise<number | null> {
  const r = await judge<{ similarity: number }>(
    client,
    'face_similarity',
    {
      type: 'object',
      properties: { similarity: { type: 'integer', enum: [1, 2, 3, 4, 5] } },
      required: ['similarity'],
      additionalProperties: false,
    },
    [
      {
        type: 'text',
        text: 'Do not identify anyone. Only compare visual features of the face in the first photo (reference) and the person in the second photo (generated): face shape, eyes, eyebrows, nose, lips, skin tone, hairstyle and hair color. Score 1 to 5 how closely the second photo matches the first (5 = looks the same, 1 = clearly different).',
      },
      { type: 'image_url', image_url: { url: referenceUrl, detail: 'high' } },
      { type: 'image_url', image_url: { url: generatedUrl, detail: 'high' } },
    ],
  );
  return r?.similarity ?? null;
}

async function editOnce(client: OpenAI, photo: File, prompt: string): Promise<string> {
  const res = await withRetry(() =>
    client.images.edit({
      model: IMAGE_MODEL,
      image: photo,
      prompt,
      size: '1024x1536',
      quality: 'medium',
      // input_fidelity 는 mini 모델에서 지원하지 않는다
      ...(IMAGE_MODEL.includes('mini') ? {} : { input_fidelity: 'high' as const }),
    }),
  );
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('이미지 생성 결과가 비어 있습니다.');
  return `data:image/png;base64,${b64}`;
}

interface Candidate {
  dataUrl: string;
  fullBody: boolean; // 판정 불가(null)는 true 로 간주
  score: number; // 얼굴 유사도 (판정 불가는 FACE_PASS_SCORE)
}

// 이미지 생성이 실패로 끝나지 않도록 단계적으로 시도한다.
//  1) 일반 편집 → 전신·얼굴 유사도 검사 통과 시 즉시 반환
//  2) 통과하지 못하면 더 멀리서 찍도록 지시 → 그래도 안 되면 사진을 세로 캔버스에 올려 몸이 들어갈 자리를 만들어 재시도
//  3) 일시적 API 오류(한도·서버·네트워크)는 지수 백오프로 재시도
//  4) 끝까지 기준을 못 맞추면 후보 중 가장 좋은 이미지를 반환한다 (전신 > 얼굴 유사도 순)
// 후보가 하나도 없을 때(인증 오류, 지속적인 API 장애)만 오류로 처리한다.
export async function generateOutfit(
  client: OpenAI,
  photo: PreparedPhoto,
  season: SeasonKey,
  index: number,
  gender: Gender,
): Promise<string> {
  const basePrompt = buildOutfitPlan(season, index, gender).prompt;
  const candidates: Candidate[] = [];
  let lastError: unknown = null;
  let padded: File | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      let input = photo.file;
      if (attempt >= PADDED_FROM_ATTEMPT) {
        padded ??= await padForFullBody(photo);
        input = padded;
      }
      const dataUrl = await editOnce(client, input, basePrompt + RETRY_NOTES[attempt]);

      const full = await isFullBody(client, dataUrl);
      const fullBody = full !== false;
      const similarity = fullBody ? await faceSimilarity(client, photo.dataUrl, dataUrl) : null;
      const score = similarity ?? FACE_PASS_SCORE;

      if (fullBody && score >= FACE_PASS_SCORE) return dataUrl;
      candidates.push({ dataUrl, fullBody, score });
      console.warn(`스타일링 ${index + 1}: ${attempt + 1}/${MAX_ATTEMPTS}번째 시도 - ${fullBody ? '얼굴 유사도 미달' : '전신 아님'}, 다음 방식으로 재시도`);
    } catch (e) {
      if (isAuthError(e)) throw e;
      lastError = e;
      console.warn(`스타일링 ${index + 1}: ${attempt + 1}/${MAX_ATTEMPTS}번째 시도 실패, 다음 방식으로 재시도`, e);
    }
  }

  if (candidates.length > 0) {
    // 전신 이미지를 우선하고, 같은 조건에서는 얼굴 유사도가 높은 것을 고른다
    candidates.sort((a, b) => Number(b.fullBody) - Number(a.fullBody) || b.score - a.score);
    return candidates[0].dataUrl;
  }
  throw lastError ?? new Error('이미지 생성에 실패했습니다.');
}
