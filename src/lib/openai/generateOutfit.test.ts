import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { generateOutfit } from './outfits';
import type { PreparedPhoto } from '../../types';

const photo: PreparedPhoto = {
  file: new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' }),
  dataUrl: 'data:image/jpeg;base64,AAAA',
};

interface FakeOptions {
  fullBody: boolean;
  similarity: number;
  editError?: { status: number };
}

// OpenAI 클라이언트의 필요한 부분만 흉내 낸다
function fakeClient(opts: FakeOptions) {
  const edit = vi.fn(async () => {
    if (opts.editError) throw Object.assign(new Error('boom'), opts.editError);
    return { data: [{ b64_json: 'QUJD' }] };
  });
  const create = vi.fn(async (args: { response_format: { json_schema: { name: string } } }) => {
    const name = args.response_format.json_schema.name;
    const body = name === 'full_body_check' ? { full_body_visible: opts.fullBody } : { similarity: opts.similarity };
    return { choices: [{ message: { content: JSON.stringify(body) } }] };
  });
  const client = { images: { edit }, chat: { completions: { create } } } as unknown as OpenAI;
  return { client, edit };
}

describe('generateOutfit: 이미지 생성은 기준을 못 맞춰도 실패로 끝나지 않는다', () => {
  it('전신·얼굴 검사를 통과하면 첫 시도에서 바로 반환한다', async () => {
    const { client, edit } = fakeClient({ fullBody: true, similarity: 5 });
    const url = await generateOutfit(client, photo, 'summer', 0, 'female');
    expect(url).toBe('data:image/png;base64,QUJD');
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('검사에 계속 탈락해도 여러 번 시도한 뒤 가장 나은 후보를 반환한다 (오류 없음)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client, edit } = fakeClient({ fullBody: false, similarity: 1 });
    const url = await generateOutfit(client, photo, 'winter', 1, 'male');
    expect(url).toBe('data:image/png;base64,QUJD');
    expect(edit.mock.calls.length).toBeGreaterThan(1);
  });

  it('얼굴 유사도만 낮아도 오류 없이 후보를 반환한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = fakeClient({ fullBody: true, similarity: 2 });
    await expect(generateOutfit(client, photo, 'spring', 0, 'female')).resolves.toMatch(/^data:image\/png/);
  });

  it('인증 오류(401)는 재시도 없이 즉시 오류로 알린다', async () => {
    const { client, edit } = fakeClient({ fullBody: true, similarity: 5, editError: { status: 401 } });
    await expect(generateOutfit(client, photo, 'autumn', 0, 'female')).rejects.toMatchObject({ status: 401 });
    expect(edit).toHaveBeenCalledTimes(1);
  });
});
