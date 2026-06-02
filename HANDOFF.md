# ForProvinces — HANDOFF

> 다음 세션 Claude가 이 문서만 읽고 즉시 작업을 재개할 수 있도록 작성된 컨텍스트 문서.

---

## 1. 프로젝트 개요

**프로젝트명:** ForProvinces  
**목적:** 전국 지도에 공연장 위치를 클러스터맵으로 시각화하고, 현재 공연 중인 연극·뮤지컬·전시 정보(예매일, 캐스팅 페어, 공연 소개 등)를 제공하는 웹 앱

### 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일 | Tailwind CSS + Shadcn UI |
| DB | Supabase (PostgreSQL + PostGIS) |
| 지도 | Kakao Maps API (Clusterer) |
| 외부 API | KOPIS 공연예술통합전산망 OpenAPI (XML) |
| 스케줄러 | 별도 Node.js 프로세스 (node-cron + tsx) |
| XML 파싱 | Next.js 앱: `fast-xml-parser` / 스케줄러: `xml2js` |

### 폴더 구조

```
forProvinces/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # 메인 페이지 (지도 + 필터 + 사이드바 + DEV 버튼 3개)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── venues/route.ts             # GET: "공연중" 공연장 전체 반환 (bounds 없음)
│   │       ├── venues/[id]/route.ts        # GET: 공연장 상세 (venue+venuedetail+theatre 통합)
│   │       ├── performances/route.ts       # GET: 공연 목록
│   │       ├── performances/[id]/route.ts  # GET: 공연 상세
│   │       ├── sync/route.ts               # POST: KOPIS 공연 데이터 동기화 (인증 필요)
│   │       ├── sync-venues/route.ts        # POST: KOPIS 공연시설 동기화 (DEV용, 인증 없음)
│   │       ├── sync-prfm/route.ts          # POST: KOPIS 공연 목록+상세 동기화 (DEV용, afterdate 없음)
│   │       ├── sync-prfm-detail/route.ts   # POST: KOPIS 공연상세만 동기화 (DEV용, startPage 지원)
│   │       └── health/route.ts             # GET: 헬스체크
│   ├── components/
│   │   ├── map/KakaoMap.tsx
│   │   ├── filter/CategoryFilter.tsx
│   │   ├── sidebar/PerformanceSidebar.tsx
│   │   ├── sidebar/PerformanceCard.tsx
│   │   ├── sidebar/PerformanceDetail.tsx
│   │   ├── debug/SyncVenuesButton.tsx      # [DEV] 공연시설 수집 트리거 버튼 (노란색)
│   │   ├── debug/SyncPrfmButton.tsx        # [DEV] 공연 목록+상세 수집 트리거 버튼 (파란색)
│   │   └── debug/SyncPrfmDetailButton.tsx  # [DEV] 공연상세만 수집 트리거 버튼 (보라색)
│   ├── lib/
│   │   ├── supabase.ts                     # Supabase 클라이언트 싱글턴 (NEXT_PUBLIC_SUPABASE_URL)
│   │   ├── kopis.ts                        # KOPIS API 클라이언트 + fast-xml-parser
│   │   └── utils.ts
│   ├── store/mapStore.ts                   # Zustand 지도 상태
│   └── types/index.ts                      # 전체 TypeScript 타입 정의
├── scheduler/                              # 독립 Node.js 스케줄러 (Next.js와 무관)
│   ├── index.ts                            # cron 등록 (공연시설: 매주 월 03:00 / 공연: 매일 04:00 KST)
│   ├── package.json                        # "type":"module", tsx로 실행
│   ├── tsconfig.json
│   ├── types.ts                            # venue/venuedetail/theatre XML·DB 타입
│   ├── types/
│   │   └── prfm.ts                         # prfm/prfmdetail XML·DB 타입
│   ├── apis/
│   │   ├── venue.ts                        # API 3: 공연시설 목록 수집 → venue upsert (afterdate 포함)
│   │   ├── venueDetail.ts                  # API 4: 공연시설 상세 수집 → venuedetail + theatre upsert
│   │   ├── prfm.ts                         # API 1: 공연 목록 수집 → prfm upsert (afterdate 포함)
│   │   └── prfmDetail.ts                   # API 2: 공연 상세 수집 → prfmdetail upsert
│   ├── mappers/
│   │   ├── venueMapper.ts                  # XML db → venue 행 변환
│   │   ├── venueDetailMapper.ts            # XML db → venuedetail 행 변환 (la/lo: parseFloat)
│   │   ├── theatreMapper.ts                # mt13[] 우선, 없으면 mt10id+'-01' 대체
│   │   ├── prfmMapper.ts                   # XML db → prfm 행 변환
│   │   └── prfmDetailMapper.ts             # XML db → prfmdetail 행 변환
│   └── utils/
│       ├── supabase.ts                     # 스케줄러용 Supabase 클라이언트
│       ├── fetchKopis.ts                   # BROWSER_HEADERS + res.ok 체크 포함 fetch 유틸
│       ├── xmlParser.ts                    # xml2js parseStringPromise 래퍼
│       ├── delay.ts                        # ms 딜레이 유틸
│       └── dateHelper.ts                   # getTodayYYYYMMDD / getYearAgoYYYYMMDD / getYearLaterYYYYMMDD
├── src/images/marker.png                   # 지도 커스텀 마커 이미지 (65×35px)
├── ERD                                     # dbdiagram.io 형식 DB 스키마
├── prisma/schema.prisma                    # (참고용 — 현재 주 클라이언트는 Supabase JS)
└── HANDOFF.md                              # 이 파일
```

---

## 2. 현재 진행 상태

### ✅ 완료된 작업

**스케줄러 (scheduler/)**
- [x] `venue.ts` — KOPIS API 3 (공연시설 목록) 전체 페이지네이션 수집 → `venue` 테이블 upsert
- [x] `venueDetail.ts` — KOPIS API 4 (공연시설 상세) 수집 → `venuedetail` + `theatre` 테이블 upsert
- [x] `prfm.ts` — KOPIS API 1 (공연 목록) 전체 페이지네이션 수집 → `prfm` 테이블 upsert
- [x] `prfmDetail.ts` — 공연 상세 수집 → `prfmdetail` 테이블 upsert
- [x] `dateHelper.ts`, `types/prfm.ts`, 매퍼 전체, cron 2개 등록

**Next.js API — sync-prfm-detail 개선 (2026-06-01)**
- [x] KOPIS WAF Rate Limit 대응: 요청 딜레이 `100ms → 500ms`
- [x] WAF 차단(HTTP 400 "Request Blocked") 감지 시 3초 대기 후 자동 1회 재시도
- [x] `startPage` 파라미터 지원 — 수집 실패 시 해당 페이지부터 재시작 가능
  ```bash
  # 처음부터
  POST /api/sync-prfm-detail  {}
  # page 27에서 실패 후 재시작
  POST /api/sync-prfm-detail  { "startPage": 27 }
  ```
- [x] 실패 발생 시 로그에 `(page N, index M)` 표시 + `재시작 시 startPage=N` 힌트 출력
- [x] 응답 JSON에 `failedPage` 반환

**지도 마커 커스텀 (2026-06-01)**
- [x] `src/images/marker.png` 커스텀 이미지 적용, 크기 65×35px
- [x] Kakao Maps `MarkerImage` + `Size` 타입 선언 추가

**지도 마커 필터링 — "공연중"만 표시 (2026-06-01)**
- [x] `GET /api/venues` 응답을 `prfm.state = "공연중"` 공연장만 반환하도록 변경
- [x] `prfmdetail` 의존 제거 (수집 미완료 시에도 동작): `prfm.venuenm ↔ venue.venuenm` 직접 매칭
- [x] Korean 이름 `.in()` URL 인코딩 문제(HeadersOverflowError) 해결: `venue` 전체를 range 페이지네이션으로 가져와 메모리 교차

**지도 클러스터링 구조 개선 (2026-06-01)**
- [x] `GET /api/venues` bounds 파라미터 완전 제거 — "공연중" 공연장 전체를 한 번에 반환
- [x] `KakaoMap`: 초기화 시 1회 fetch → 클러스터러에 전체 등록, `bounds_changed`에서 마커 재요청 제거
- [x] `bounds_changed`는 사이드바용 `setBounds` 추적만 담당
- [x] 불필요해진 `debounce`, `fetchIdRef`, `debouncedFetch` 제거

### 🔄 진행 중

- prfm, prfmdetail 데이터 초기 적재 테스트 중 (DEV 버튼으로 수동 실행)
- sync-prfm-detail WAF 차단 및 중단 재시작 검증 중

### ⬜ 미완료 / 예정 작업

**프론트엔드**
- [ ] 마커 클릭 → 해당 공연장의 공연 목록 표시 (sidebar 연동)
- [ ] `prfm` / `prfmdetail` 테이블 기반 공연 목록 실 데이터 연동
- [ ] 캐스팅 페어, 예매 정보 UI

**배포 전 정리 (⚠️ 필수)**
- [ ] DEV 버튼 3개 제거 또는 `process.env.NODE_ENV === 'development'` 조건 렌더링
- [ ] `POST /api/sync-venues`, `POST /api/sync-prfm`, `POST /api/sync-prfm-detail` — Bearer 인증 추가 또는 라우트 삭제
- [ ] **`sync-prfm/route.ts`에 afterdate 복원** — 현재 DEV 목적으로 afterdate 파라미터 제거 상태
- [ ] `SyncVenuesButton` fetch에 AbortController timeout 추가

---

## 3. 주요 설계 결정사항

### 스케줄러를 Next.js 앱과 분리한 이유
- KOPIS 전체 수집은 수천 건 × 500ms 딜레이 = 수십 분 소요
- Next.js API Route의 서버리스 타임아웃 내 완료 불가
- 스케줄러는 독립 Node.js 프로세스로 별도 실행 (`cd scheduler && npm start`)

### DEV route에서 afterdate를 제거한 이유
- 스케줄러는 `afterdate=오늘` 포함 → 매일 증분 수집
- DEV route는 `afterdate` 제거 → 과거~미래 전체 범위 수집 (초기 적재용)
- **배포 전 반드시 afterdate 복원 필요**

### DEV route에서 node:http를 사용하는 이유
- Next.js App Router는 global `fetch`를 패치해 내부 헤더를 자동 추가
- KOPIS `/pblprfr`(공연) 엔드포인트 WAF가 이를 감지해 HTTP 400 "Request Blocked" 반환
- `node:http`/`node:https` 모듈 직접 사용으로 전송 헤더 완전 제어
- **새로운 KOPIS pblprfr 호출 코드 작성 시 동일 패턴 적용 필요**

### sync-prfm-detail WAF 대응 및 재시작 설계
- KOPIS WAF는 고빈도 요청 시 IP 단위로 일시 차단 → 딜레이 500ms(초당 2건)로 낮춤
- 차단 감지(HTTP 400 + "Request Blocked") 시 3초 대기 후 1회 자동 재시도
- 수집 도중 실패 발생 시 응답의 `failedPage` 값으로 `startPage` 지정해 재시작
  ```
  1페이지 = 처음 100건 (PAGE_SIZE=100)
  실패 로그 예: "PF275761 처리 실패 (page 27, index 2676)"
  재시작: POST /api/sync-prfm-detail { "startPage": 27 }
  ```

### 클러스터러 마커 전체 fetch 전략 (bounds 기반 재요청 제거)
- **문제**: bounds_changed마다 API 재호출 → 뷰마다 마커 세트가 교체됨
  - 전국 뷰: 비서울 공연장 다수 포함, "공연중" 교차 후 소수만 남음 → 클러스터 값 작음
  - 서울 뷰: 서울 공연장 집중 조회, 대부분 "공연중" → 클러스터 값 큼
  - 결과: 축소할수록 클러스터 값이 줄고 확대할수록 늘어나는 역전 현상
- **원인**: Kakao MarkerClusterer는 마커 전체를 한번에 받아 줌 레벨에 따라 자체 클러스터링하도록 설계됨. 마커 세트를 뷰마다 교체하면 클러스터러 동작 전제가 깨짐
- **해결**: "공연중" 공연장 전체(수백 건)를 초기화 시 1회 fetch → 클러스터러에 전체 등록 → 이후 줌/이동은 클러스터러가 동일 마커 세트를 재클러스터링

### venue 전체 range 페이지네이션 + venueid 청크 전략
- **문제**: `venue.venuenm`(한글)을 `.in()` 배열로 전달하면 URL 인코딩 시 글자당 ~9byte → 대량 배열이 URL 한계 초과 → `HeadersOverflowError`
- **해결**: `venue` 테이블 전체를 range 페이지네이션(1000행씩)으로 로컬에 가져온 뒤 메모리에서 교차. `.in()`은 짧은 ASCII 코드인 `venueid`에만 사용

### 쿼리 체인 — venues API (현재)
```
prfm (state="공연중", LIMIT 10000) ──→ venuenm Set
                                          ↓ 메모리 교차
venue (전체, range 페이지네이션) ──────→ 활성 {venueid, venuenm}[]
                                          ↓
venuedetail (.in("venueid", 300청크)) ──→ {la, lo}[] + 조립 → VenueMarker[]
```

### 두 가지 XML 파서 공존 이유
- Next.js 앱: `fast-xml-parser` / 스케줄러: `xml2js`
- AST 구조가 달라 매퍼가 분리됨

### Supabase 1000행 상한 우회
```typescript
// range 페이지네이션 패턴
while (true) {
  const { data } = await supabase.from(table).select(col).range(from, from + 999);
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
```

---

## 4. 파일별 역할 요약

### Next.js 앱

| 파일 | 역할 |
|------|------|
| `src/lib/supabase.ts` | Next.js용 Supabase 싱글턴 (globalThis 캐싱) |
| `src/lib/kopis.ts` | KOPIS API 클라이언트 (fast-xml-parser) |
| `src/types/index.ts` | 전체 TypeScript 타입 (VenueMarker, PerformanceDetail 등) |
| `src/app/api/venues/route.ts` | "공연중" 공연장 전체 반환. bounds 없음. prfm→venue(range)→venuedetail 체인 |
| `src/app/api/venues/[id]/route.ts` | 공연장 상세 (venue+venuedetail+theatre 통합) |
| `src/app/api/performances/route.ts` | venueId 기반 공연 목록 반환 |
| `src/app/api/sync-venues/route.ts` | 공연시설 수집 DEV 버전 |
| `src/app/api/sync-prfm/route.ts` | 공연 목록+상세 수집 DEV 버전 (**afterdate 없음**, node:http 사용) |
| `src/app/api/sync-prfm-detail/route.ts` | 공연 상세만 수집. 딜레이 500ms, WAF 재시도, **startPage 재시작 지원** |
| `src/app/api/sync/route.ts` | 공연 데이터 KOPIS 동기화 (Bearer 인증) |
| `src/components/map/KakaoMap.tsx` | 카카오맵 초기화 + 1회 fetch로 클러스터러 전체 등록. bounds_changed는 setBounds만 담당 |
| `src/components/filter/CategoryFilter.tsx` | 카테고리 필터 UI |
| `src/components/sidebar/PerformanceSidebar.tsx` | 공연 목록/상세 사이드바 |
| `src/components/debug/SyncVenuesButton.tsx` | [DEV] 공연시설 수집 트리거 (노란색) |
| `src/components/debug/SyncPrfmButton.tsx` | [DEV] 공연 목록+상세 수집 트리거 (파란색) |
| `src/components/debug/SyncPrfmDetailButton.tsx` | [DEV] 공연상세만 수집 트리거 (보라색) |
| `src/store/mapStore.ts` | Zustand — bounds, 선택 공연장, 마커 목록 상태 |
| `src/images/marker.png` | 지도 커스텀 마커 이미지 (65×35px) |

### 스케줄러

| 파일 | 역할 |
|------|------|
| `scheduler/index.ts` | cron 등록 진입점 (공연시설: 매주 월 03:00 / 공연: 매일 04:00 KST) |
| `scheduler/apis/venue.ts` | KOPIS API 3 공연시설 목록 수집 → venue upsert |
| `scheduler/apis/venueDetail.ts` | 공연시설 상세/홀 수집 → venuedetail, theatre upsert |
| `scheduler/apis/prfm.ts` | KOPIS API 1 공연 목록 수집 → prfm upsert |
| `scheduler/apis/prfmDetail.ts` | 공연 상세 수집 → prfmdetail upsert |
| `scheduler/utils/fetchKopis.ts` | BROWSER_HEADERS + res.ok 체크 포함 KOPIS fetch 유틸 |

---

## 5. 환경변수 목록

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Kakao Maps
NEXT_PUBLIC_KAKAO_MAP_KEY=...

# KOPIS API
KOPIS_API_KEY=...
KOPIS_BASE_URL=http://kopis.or.kr/openApi/restful/pblprfr
KOPIS_VENUE_URL=http://kopis.or.kr/openApi/restful/prfplc

# 내부 API 보호
CRON_SECRET=...
```

> **주의:** 스케줄러는 `dotenv/config`로 프로젝트 루트의 `.env`를 로드. `NEXT_PUBLIC_SUPABASE_URL`을 그대로 읽음.

---

## 6. 다음 세션에서 할 작업

### 우선순위 1 — prfm/prfmdetail 초기 적재 확인
- DEV 버튼으로 수집 후 Supabase에서 데이터 확인
- sync-prfm-detail 실패 시 `failedPage` 값으로 `startPage` 지정 재시작 검증

### 우선순위 2 — 프론트엔드 공연 데이터 연동
- 마커 클릭 → 해당 공연장의 공연 목록 표시 (사이드바 연동)
- `prfm` / `prfmdetail` 테이블 기반 실 데이터 연동
- 캐스팅 페어, 예매 정보 UI

### 우선순위 3 — 프로덕션 배포 전 정리
- DEV 버튼 3개 제거 또는 dev 환경 조건 처리
- 인증 없는 POST 엔드포인트에 Bearer 인증 추가
- **`sync-prfm/route.ts` afterdate 복원**
- AbortController timeout 추가 (SyncVenuesButton, SyncPrfmButton)

---

## 7. 주의사항 / 알려진 이슈

### 🔴 배포 전 반드시 처리

| 이슈 | 위치 | 설명 |
|------|------|------|
| **afterdate 미복원** | `src/app/api/sync-prfm/route.ts` | DEV 목적으로 afterdate 제거됨. 프로덕션 전환 시 `&afterdate=${getToday()}` 복원 필요 |
| **인증 없는 POST** | `sync-venues`, `sync-prfm`, `sync-prfm-detail` | 세 엔드포인트 모두 인증 없음. `/api/sync`의 Bearer 패턴 참고 |
| **fetch timeout 없음** | `SyncVenuesButton.tsx`, `SyncPrfmButton.tsx` | 수십 분 소요. AbortController + signal 추가 필요 |

### ⚠️ 특이사항

- **KOPIS pblprfr WAF 차단:** Next.js global fetch 패치 → KOPIS WAF 감지 → HTTP 400. `sync-prfm`, `sync-prfm-detail`은 `node:http` 직접 사용으로 해결. 새로운 pblprfr 호출 코드 작성 시 동일 패턴 필수.

- **sync-prfm-detail 중단 재시작:** 수집 중 WAF 차단으로 실패 발생 시 로그의 `page N` 값을 확인하고 `{ "startPage": N }` 으로 재요청. 자동 재시도(3초 대기 1회)로도 복구 안 되면 일정 시간 후 수동 재시작.

- **prfmdetail 수집 미완료 시 공연장 필터링:** venues API는 `prfmdetail`을 사용하지 않고 `prfm.venuenm ↔ venue.venuenm` 직접 매칭. prfmdetail 적재 여부와 무관하게 지도 마커는 표시됨.

- **venuenm 불일치 가능성:** `prfm.venuenm`(KOPIS 공연 목록의 `fcltynm`)과 `venue.venuenm`(KOPIS 공연시설 목록의 `fcltynm`)은 동일 API에서 오므로 일반적으로 일치. 단, 이름 변경 등으로 불일치 시 해당 공연장은 지도에 미표시. Supabase에서 직접 확인 가능.

- **스케줄러 pblprfr 미검증:** 스케줄러는 standalone Node.js라 Next.js fetch 패치 없음. 이론상 문제없으나 실제 prfm 파이프라인 실행 테스트 미완료. 400 오류 발생 시 `fetchKopis.ts`를 `node:http` 기반으로 교체.

- **스케줄러 실행 방법:**
  ```bash
  cd scheduler
  npm install   # 최초 1회
  npm start     # tsx index.ts → 크론 등록 후 대기
  ```

- **DEV 버튼 위치:** 지도 우상단 세로 스택 (노란 공연시설 → 파란 공연 → 보라 공연상세 순)
