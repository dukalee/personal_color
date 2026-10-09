import { useEffect, useState } from 'react';
import { Deck } from './components/Deck';
import { ApiKeyStep, ProgressPanel, Stepper, UploadStep, type TaskState } from './components/wizard';
import { createClient, toKoreanMessage } from './lib/openai/client';
import { diagnose } from './lib/openai/diagnose';
import { OUTFIT_COUNT, generateOutfit } from './lib/openai/outfits';
import { preparePhoto } from './lib/image';
import type { Analysis, Gender, OutfitState, PreparedPhoto, Reliability, SeasonKey } from './types';

const NO_PHOTO_MESSAGE = '퍼스널 컬러 진단을 위해 얼굴이 잘 보이는 사진을 먼저 업로드해주세요.';

type Phase = 'idle' | 'diagnosing' | 'generating' | 'done';
type Step = 1 | 2 | 3;

const DIAGNOSIS_SHARE = 20; // 진단이 전체 진행률에서 차지하는 비중(%)
const pendingOutfits = (): OutfitState[] => Array.from({ length: OUTFIT_COUNT }, () => ({ status: 'pending' }));

export function App() {
  const [step, setStep] = useState<Step>(1);
  const [apiKey, setApiKey] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [season, setSeason] = useState<SeasonKey | null>(null);
  const [tone, setTone] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [reliability, setReliability] = useState<Reliability | null>(null);
  const [outfits, setOutfits] = useState<OutfitState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [shown, setShown] = useState(0);

  const busy = phase === 'diagnosing' || phase === 'generating';
  const settledCount = outfits.filter((o) => o.status !== 'pending').length;

  // 진행률: 완료된 작업만큼 바닥값이 오르고, 다음 완료 전까지는 천천히 차오른다
  const share = (100 - DIAGNOSIS_SHARE) / OUTFIT_COUNT;
  const floor = phase === 'done' ? 100 : phase === 'generating' ? DIAGNOSIS_SHARE + settledCount * share : 4;
  const ceiling = phase === 'generating' ? Math.min(97, floor + share - 3) : DIAGNOSIS_SHARE - 3;
  const percent = phase === 'done' ? 100 : Math.max(shown, floor);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setShown((s) => Math.max(s, floor) + (ceiling - Math.max(s, floor)) * 0.05), 500);
    return () => clearInterval(id);
  }, [busy, floor, ceiling]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await preparePhoto(file));
      setMessage(null);
    } catch (e) {
      setMessage(toKoreanMessage(e));
    }
  }

  function setOutfit(i: number, state: OutfitState) {
    setOutfits((prev) => prev.map((o, idx) => (idx === i ? state : o)));
  }

  async function makeOutfit(i: number, s: SeasonKey, p: PreparedPhoto, g: Gender) {
    setOutfit(i, { status: 'pending' });
    try {
      const dataUrl = await generateOutfit(createClient(apiKey.trim()), p, s, i, g);
      setOutfit(i, { status: 'done', dataUrl });
    } catch (e) {
      console.error(`스타일링 ${i + 1} 생성 실패`, e);
      setOutfit(i, { status: 'error', message: toKoreanMessage(e) });
    }
  }

  async function start() {
    if (!photo) return setMessage(NO_PHOTO_MESSAGE);
    if (!gender) return setMessage('스타일링 추천을 위해 성별을 선택해주세요.');

    setMessage(null);
    setSeason(null);
    setReliability(null);
    setShown(0);
    setPhase('diagnosing');
    try {
      const outcome = await diagnose(createClient(apiKey.trim()), photo.dataUrl, gender);
      if (!outcome.faceDetected) {
        setPhase('idle');
        return setMessage(`${NO_PHOTO_MESSAGE}${outcome.reason ? ` (${outcome.reason})` : ''}`);
      }
      setSeason(outcome.season);
      setAnalysis(outcome.analysis);
      setTone(outcome.tone);
      setReliability(outcome.reliability);
      setOutfits(pendingOutfits());
      setPhase('generating');
      await Promise.all(Array.from({ length: OUTFIT_COUNT }, (_, i) => makeOutfit(i, outcome.season, photo, gender)));
      setPhase('done');
      setStep(3);
    } catch (e) {
      setPhase('idle');
      setMessage(toKoreanMessage(e));
    }
  }

  function restart() {
    setPhase('idle');
    setSeason(null);
    setOutfits([]);
    setMessage(null);
    setStep(2);
  }

  const taskState = (done: boolean, active: boolean, error = false): TaskState =>
    error ? 'error' : done ? 'done' : active ? 'active' : 'wait';

  const tasks = [
    { label: '얼굴 색 분석 · 퍼스널 컬러 진단', state: taskState(phase === 'generating', phase === 'diagnosing') },
    {
      label: `스타일링 추천 중... (${settledCount}/${OUTFIT_COUNT})`,
      state: taskState(
        outfits.length > 0 && settledCount === OUTFIT_COUNT,
        phase === 'generating',
        outfits.some((o) => o.status === 'error'),
      ),
    },
  ];

  const title = phase === 'diagnosing' ? '얼굴 색을 분석하고 있어요' : '스타일링 추천 중...';

  return (
    <main className="shell">
      <header className="hero">
        <span className="badge">AI PERSONAL COLOR ASSISTANT</span>
        <h1>
          나에게 어울리는 <em>색</em>을 찾아드려요
        </h1>
        <p>사진 한 장으로 퍼스널 컬러와 맞춤 스타일링을 확인해보세요</p>
      </header>

      <Stepper current={step} />

      {step === 1 && <ApiKeyStep apiKey={apiKey} onChange={setApiKey} onNext={() => setStep(2)} />}

      {step === 2 &&
        (busy ? (
          <ProgressPanel percent={percent} title={title} tasks={tasks} />
        ) : (
          <UploadStep
            photo={photo}
            gender={gender}
            message={message}
            onFile={onFile}
            onGender={setGender}
            onStart={start}
            onBack={() => setStep(1)}
          />
        ))}

      {step === 3 && season && analysis && reliability && photo && gender && (
        <section className="result">
          <div className="result-head">
            <h2>진단이 완료됐어요</h2>
            <p>좌우 화살표로 넘겨가며 결과를 확인해보세요</p>
          </div>
          {reliability.level !== '높음' && (
            <p className="notice">
              진단 신뢰도: {reliability.level}
              {reliability.issues.length > 0 && ` — ${reliability.issues.join(', ')}`}. 조명이 고른 자연광 사진이면 더 정확합니다.
            </p>
          )}
          <Deck
            season={season}
            analysis={analysis}
            tone={tone}
            reliability={reliability}
            photoUrl={photo.dataUrl}
            outfits={outfits}
            gender={gender}
          />
          <button className="link" onClick={restart}>
            다시 진단하기
          </button>
        </section>
      )}

      <footer className="site-footer">© 2026 AI SHIFT. All rights reserved.</footer>
    </main>
  );
}
