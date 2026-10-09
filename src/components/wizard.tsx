import { useState, type DragEvent } from 'react';
import { isValidApiKey, toKoreanMessage, verifyApiKey } from '../lib/openai/client';
import type { Gender, PreparedPhoto } from '../types';

/* ---------- 단계 표시 ---------- */
const STEPS = ['API키 입력', '사진 업로드', '진단 결과'];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="stepper" aria-label="진행 단계">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'active' : '';
        return (
          <li key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className={`step-line ${n <= current ? 'done' : ''}`} />}
            <span className={`step ${state}`} aria-current={n === current ? 'step' : undefined}>
              <span className="step-dot">{n < current ? '✓' : n}</span>
              <span className="step-label">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- 1단계: API 키 ---------- */
interface ApiKeyStepProps {
  apiKey: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function ApiKeyStep({ apiKey, onChange, onNext }: ApiKeyStepProps) {
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = apiKey.trim();
  const invalid = trimmed.length > 0 && !isValidApiKey(trimmed);
  const ready = trimmed.length > 0 && !invalid && !checking;

  // 다음 단계로 가기 전에 OpenAI에 키를 실제로 확인한다. 유효하지 않으면 넘어가지 않는다.
  async function submit() {
    if (!ready) return;
    setChecking(true);
    setError(null);
    try {
      await verifyApiKey(trimmed);
      onNext();
    } catch (e) {
      setError(toKoreanMessage(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2>OpenAI API 키를 입력해주세요</h2>
      <p className="lead">얼굴 분석과 스타일링 이미지 생성에 OpenAI API를 사용해요.</p>

      <div className="input-row">
        <input
          type={show ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => {
            onChange(e.target.value);
            setError(null);
          }}
          placeholder="sk-..."
          autoComplete="off"
          autoFocus
          aria-label="OpenAI API 키"
        />
        <button type="button" className="toggle" onClick={() => setShow((s) => !s)}>
          {show ? '숨기기' : '보기'}
        </button>
      </div>

      {invalid && (
        <p className="notice">
          한글이나 특수 문자(전각 문자, …, 따옴표 등)가 섞여 있어요. 한/영 키를 영문으로 바꾸고, 키만 정확히 복사해 붙여넣어주세요.
        </p>
      )}

      {error && <p className="notice">{error}</p>}

      <div className="secure">
        <span aria-hidden>🔒</span>
        <span>
          키는 <b>이 브라우저에서 OpenAI로 직접</b> 전송되고, 서버나 저장소에는 <b>저장되지 않아요.</b> 페이지를 닫으면 사라집니다.
        </span>
      </div>

      <button type="submit" className="btn primary" disabled={!ready}>
        {checking ? '키 확인 중...' : '다음'}
      </button>
    </form>
  );
}

/* ---------- 2단계: 사진 업로드 ---------- */
const GOOD_PHOTO = [
  '정면을 바라보고 얼굴 전체가 또렷하게 보여요',
  '자연광(창가·야외 그늘)에서 밝게 찍었어요',
  '화장·필터·보정이 거의 없어요',
  '앞머리와 머리카락이 이마·볼을 가리지 않아요',
  '머리부터 발끝까지 나온 사진이면 스타일링 이미지가 더 자연스러워요',
];

const BAD_PHOTO = [
  '노란·푸른 조명, 역광, 짙은 그림자가 있는 사진',
  '뷰티 필터나 강한 보정, 짙은 화장이 들어간 사진',
  '선글라스·마스크·모자로 얼굴이 가려진 사진',
  '단체 사진이거나 얼굴이 작게 나온 사진',
  '흐리거나 해상도가 낮은 사진',
];

function PhotoGuide() {
  return (
    <div className="guide">
      <div className="guide-col good">
        <strong>
          <span aria-hidden>👍</span> 이런 사진이 좋아요
        </strong>
        <ul>
          {GOOD_PHOTO.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="guide-col bad">
        <strong>
          <span aria-hidden>🚫</span> 이런 사진은 피해주세요
        </strong>
        <ul>
          {BAD_PHOTO.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface UploadStepProps {
  photo: PreparedPhoto | null;
  gender: Gender | null;
  message: string | null;
  onFile: (file: File | undefined) => void;
  onGender: (g: Gender) => void;
  onStart: () => void;
  onBack: () => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
];

export function UploadStep({ photo, gender, message, onFile, onGender, onStart, onBack }: UploadStepProps) {
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="card">
      <h2>얼굴 사진을 올려주세요</h2>
      <p className="lead">사진에 따라 진단 정확도가 크게 달라져요. 올리기 전에 아래 안내를 확인해주세요.</p>

      <PhotoGuide />

      {photo ? (
        <div className="preview-row">
          <div className="photo-frame">
            <img src={photo.dataUrl} alt="업로드한 사진" />
            <label className="change">
              사진 바꾸기
              <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      ) : (
        <label
          className={`drop ${over ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          <span className="drop-icon" aria-hidden>📷</span>
          <strong>사진을 끌어다 놓거나 눌러서 선택</strong>
          <span>JPG · PNG · WEBP</span>
        </label>
      )}

      <fieldset className="gender">
        <legend>성별을 선택해주세요</legend>
        <p>스타일링 추천(의상 구성)에 사용돼요.</p>
        <div className="gender-options" role="radiogroup" aria-label="성별">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={gender === g.value}
              className={gender === g.value ? 'on' : ''}
              onClick={() => onGender(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>

      {message && <p className="notice">{message}</p>}

      <button className="btn primary" onClick={onStart} disabled={!photo || !gender}>
        퍼스널 컬러 진단하기
      </button>
      <button className="link" onClick={onBack}>
        ← API 키 다시 입력
      </button>
    </div>
  );
}

/* ---------- 진행 상황 (progress bar) ---------- */
export type TaskState = 'wait' | 'active' | 'done' | 'error';

interface ProgressPanelProps {
  percent: number;
  title: string;
  tasks: { label: string; state: TaskState }[];
}

export function ProgressPanel({ percent, title, tasks }: ProgressPanelProps) {
  return (
    <div className="card" role="status" aria-live="polite">
      <div className="progress-head">
        <strong>{title}</strong>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="tasks">
        {tasks.map((t) => (
          <li key={t.label} className={`task ${t.state}`}>
            <span className="mark">{t.state === 'done' ? '✓' : t.state === 'error' ? '!' : ''}</span>
            {t.label}
          </li>
        ))}
      </ul>
      <p className="wait-note">이미지를 만드는 데 1~3분 정도 걸릴 수 있어요. 창을 닫지 말고 기다려주세요.</p>
    </div>
  );
}
