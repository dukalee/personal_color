import type { PreparedPhoto } from '../types';

// 얼굴·상반신 위주의 사진은 모델이 그 구도 그대로 상반신만 그리는 경우가 많다.
// 사진을 세로로 긴(2:3) 밝은 캔버스 위쪽에 놓고 아래를 비워, 몸 전체를 그릴 자리를 만들어 준다.
export async function padForFullBody(photo: PreparedPhoto): Promise<File> {
  const W = 1024;
  const H = 1536;
  const bitmap = await createImageBitmap(photo.file);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리할 수 없습니다.');

  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, W, H);

  // 가로 62%, 세로 최대 55% 안에서 비율을 유지해 위쪽 중앙에 배치
  const scale = Math.min((W * 0.62) / bitmap.width, (H * 0.55) / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (W - w) / 2, H * 0.03, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('이미지를 처리할 수 없습니다.');
  return new File([blob], 'padded.jpg', { type: 'image/jpeg' });
}
