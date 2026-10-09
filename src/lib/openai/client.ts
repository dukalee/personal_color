import OpenAI from 'openai';

// 진단 모델은 gpt-4o-mini 로 고정한다 (환경변수로 바꾸지 않음).
export const VISION_MODEL = 'gpt-4o-mini';
export const IMAGE_MODEL = import.meta.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';

// 백엔드 없는 일회성 개인용 앱이므로 브라우저에서 직접 호출한다.
// 키는 사용자가 화면에 입력한 값만 쓰고 어디에도 저장하지 않는다.
export function createClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

// 키가 실제로 유효한지 OpenAI에 확인한다 (모델 목록 조회: 무료, 잘못된 키면 401)
export async function verifyApiKey(apiKey: string): Promise<void> {
  await createClient(apiKey).models.list();
}

// API 키는 Authorization 헤더로 전송되므로 ASCII 출력 가능 문자만 허용된다 (한글·전각 문자·공백 불가)
export function isValidApiKey(key: string): boolean {
  return /^[\x21-\x7E]+$/.test(key);
}

export function toKoreanMessage(e: unknown): string {
  if (e instanceof Error && /ISO-8859-1/.test(e.message)) {
    return 'API 키에 한글이나 특수 문자가 포함되어 있습니다. 영문·숫자로 된 키를 다시 붙여넣어주세요.';
  }
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) return 'API 키가 올바르지 않습니다. 키를 다시 확인해주세요.';
    if (e.status === 403) return '이 모델을 사용할 권한이 없습니다. OpenAI 계정(조직 인증) 상태를 확인해주세요.';
    if (e.status === 429) return '요청이 너무 많거나 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    if (e.status === 400 && /safety|moderation|content/i.test(e.message)) {
      return '콘텐츠 정책에 따라 요청이 거부되었습니다. 다른 사진으로 다시 시도해주세요.';
    }
    return `OpenAI 요청에 실패했습니다. (${e.status ?? '네트워크'}) ${e.message}`.slice(0, 300);
  }
  if (e instanceof Error) return e.message;
  return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
}
