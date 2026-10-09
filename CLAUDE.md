# Personal Color Assistant

## Project Overview

얼굴 사진을 업로드하면 퍼스널 컬러를 진단하고, **5페이지 슬라이드**로 결과를 보여주는 웹 앱 (화면 표시 전용, 다운로드 기능 없음).
OpenAI API로 얼굴을 분석하고 의상 합성 이미지를 생성한다.

- 진단 결과는 4가지 중 하나: **봄 웜톤 / 여름 쿨톤 / 가을 웜톤 / 겨울 쿨톤**
- 슬라이드 구성: 1) 사진·진단 결과·간단 설명 2) 어울리는 색 5종+추천 조합 3) 피해야 하는 색 5종+피해야 할 조합 4~5) 추천 스타일링 2개(전신 이미지 + 상의·하의·신발·액세서리 설명)
- 사진 없이는 분석하지 않고 `퍼스널 컬러 진단을 위해 얼굴이 잘 보이는 사진을 먼저 업로드해주세요.` 만 안내한다.
- 사용자에게 보이는 모든 텍스트는 한국어.

## Tech Stack

- **Language**: TypeScript (strict)
- **Frontend**: React + Vite
- **Backend**: 없음. 일회성 개인용 앱이라 브라우저에서 OpenAI API를 직접 호출한다.
  - API 키는 사용자가 화면에서 직접 입력한다 (메모리에만 보관, 배포 번들에 포함하지 않음)
- **AI**: OpenAI API
  - 얼굴 분석/진단: **`gpt-4o-mini` 고정** (`src/lib/openai/client.ts`의 `VISION_MODEL`, 변경·환경변수화 금지). 진단 지침(4계절 12톤 체계, 신뢰도 포함)은 `src/lib/openai/diagnose.ts`에 지정된 원문 그대로 전달하고 Structured Outputs로 JSON 반환
  - 의상 합성: 이미지 편집 API (`gpt-image-1-mini` 기본, 원본 얼굴을 참조 이미지로 전달)
  - 이미지 모델만 환경변수(`VITE_OPENAI_IMAGE_MODEL`)로 설정. 이미지 편집 API는 gpt-4o-mini를 지원하지 않아 별도 이미지 모델이 필요하다

### 디렉터리 구조

```
src/            # React 앱 (App: 3단계 흐름, components/wizard: 단계·진행 UI, components/Deck·slides: 결과 슬라이드)
src/lib/openai  # OpenAI 호출 (진단, 이미지 생성)
src/types       # Season, DiagnosisResult 등 공용 타입
data/           # seasons.json (컬러 데이터)
docs/           # 도메인 기준 문서
```

## Docs

| 파일 | 내용 |
|---|---|
| `data/seasons.json` | 4계절 특징, 추천/회피 컬러 5종(이름+HEX). **컬러의 단일 출처** |
| `docs/diagnosis-criteria.md` | 진단 시 관찰 요소와 4계절 판정 기준 (진단 프롬프트의 근거) |
| `docs/report-layout.md` | 5페이지 슬라이드 구성과 디자인 지침 |
| `docs/outfit-generation.md` | 의상 합성 이미지 2종 생성 조건·검증·프롬프트 |
| `.claude/skills/personal-color-report/SKILL.md` | 진단 → 리포트 작업 절차 (처리 흐름 참고용) |

## Run Commands

```bash
npm install          # 의존성 설치
npm run dev          # Vite 개발 서버
npm run build        # 타입체크 + 프로덕션 빌드
npm run typecheck    # tsc --noEmit
npm run test         # vitest (seasons.json 무결성)
```

설정: API 키는 앱 화면에서 입력한다. 이미지 모델명은 `.env`(`.env.example` 제공, `.env`는 커밋 금지)에 둔다:

```
VITE_OPENAI_IMAGE_MODEL=gpt-image-1-mini
```

`VITE_` 접두사 변수는 번들에 포함되므로 **API 키를 넣지 않는다.**

## Rules

### 도메인
1. OpenAI는 12톤 체계로 판단하지만, 리포트의 진단 결과(타이틀·컬러·테마)는 반드시 4계절 중 하나로 표시한다. 세부 톤("여름 뮤트" 등)은 타이틀이 아니라 타이틀 아래 보조 라벨로만 함께 표시한다.
2. 컬러 이름/HEX는 `data/seasons.json`에서만 가져온다. 코드에 중복 정의 금지.
3. 조명·보정으로 색 판단이 제한돼도 가장 적합한 유형 하나를 선택한다.
4. 사용자의 체형·외모·매력도를 평가하거나 단정적 외모 표현을 쓰지 않는다.
5. 성별(사용자가 직접 선택)에 따라 추천 룩을 달리한다. **남성에게 원피스·스커트·힐 등 여성용 아이템을 추천하지 않는다**(`docs/outfit-generation.md`). 의상 이미지는 **머리부터 신발까지 전신**(잘린 이미지는 검증 후 재생성, 절대 노출 금지)·정면·스튜디오 배경, 원본 얼굴과 최대한 동일하게(유사도 검증), 2개 모두 다른 스타일(로딩 시간 최소화를 위해 2개만 생성). 이미지 생성은 실패로 끝나지 않도록 단계적 재시도·대체 전략을 쓴다, 의상 색은 진단 유형의 추천 컬러만 사용. 얼굴 특징은 유지하며 마네킹 금지.

### 출력
6. 모든 단계의 카드와 결과 슬라이드는 같은 폭(`.shell` max-width 1160px)으로 통일한다. 화면 흐름은 3단계: ① API키 입력(다음 단계로 가기 전 OpenAI에 실제 호출해 유효성 확인, 무효 키는 진행 불가) ② 사진 업로드 + 성별 선택(필수, 스타일링 추천에 사용)(업로드 전에 좋은 사진/피해야 할 사진 안내를 좌우 2열로 표시) + 진단(progress bar로 진행 표시) ③ 진단 결과 슬라이드. 결과는 5페이지 슬라이드로 화면에만 보여주며, 이동은 슬라이드 좌우 가장자리의 화살표(및 스와이프·←→ 키)만 쓴다. PNG 다운로드·탭·재생성 버튼은 두지 않는다.
7. 리포트에 긴 설명 문장을 넣지 않고 핵심 정보 중심으로 구성한다.

### 코드
8. OpenAI API 키는 사용자 입력으로만 받는다. 코드·`.env`·번들·로그·커밋에 넣지 않고, localStorage에도 저장하지 않는다.
9. 진단 응답은 Structured Outputs/스키마로 검증하고, 4계절 밖의 값이나 `diagnosable=false`는 진단 불가로 처리한다. 모델이 돌려준 `best_colors`/`avoid_colors`는 쓰지 않고 `data/seasons.json`을 쓴다.
10. TypeScript `any` 사용 금지. 공용 타입은 `src/types/`에 둔다.
11. 업로드된 얼굴 사진은 진단·생성 요청에만 사용하고 OpenAI 요청 외에는 어디에도 전송·저장하지 않는다.
12. OpenAI 호출 실패(레이트리밋, 콘텐츠 정책 거부 등)는 사용자에게 한국어로 재시도 안내를 보여준다.
