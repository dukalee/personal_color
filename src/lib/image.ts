import type { PreparedPhoto } from '../types';

// 업로드 사진을 긴 변 기준 maxSize 로 줄여 JPEG 로 변환 (전송량·토큰 절감)
export async function preparePhoto(file: File, maxSize = 1024): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리할 수 없습니다.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('이미지를 처리할 수 없습니다.');
  return {
    file: new File([blob], 'photo.jpg', { type: 'image/jpeg' }),
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
  };
}
