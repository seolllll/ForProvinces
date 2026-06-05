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
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── areas/route.ts
│   │       ├── areas/catecodes/route.ts
│   │       ├── ranking/route.ts
│   │       ├── venues/route.ts
│   │       ├── venues/[id]/route.ts
│   │       ├── venues/[id]/performances/route.ts
│   │       ├── prfm/[id]/route.ts
│   │       ├── prfm/search/route.ts
│   │       ├── prfm/by-region/route.ts
│   │       ├── sync-ranking/route.ts
│   │       ├── sync-venues/route.ts
│   │       ├── sync-prfm/route.ts
│   │       └── sync-prfm-detail/route.ts
│   ├── components/
│   │   ├── map/KakaoMap.tsx
│   │   ├── filter/GenreFilter.tsx
│   │   ├── search/SearchBar.tsx
│   │   ├── sidebar/PerformanceSidebar.tsx
│   │   ├── sidebar/PerformanceDetail.tsx
│   │   ├── sidebar/RegionPerformancePanel.tsx
│   │   └── debug/
│   │       ├── DevPanel.tsx                         # DEV 버튼 그룹 접기/펼치기 래퍼
│   │       ├── SyncVenuesButton.tsx
│   │       ├── SyncPrfmButton.tsx
│   │       ├── SyncPrfmDetailButton.tsx
│   │       └── SyncRankingButton.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── store/mapStore.ts
│   └── types/index.ts
├── scheduler/
│   ├── index.ts
│   ├── apis/venue.ts, venueDetail.ts, prfm.ts, prfmDetail.ts, ranking.ts
│   ├── types/prfm.ts, ranking.ts
│   ├── mappers/
│   └── utils/supabase.ts, fetchKopis.ts, xmlParser.ts, delay.ts, dateHelper.ts
├── supabase/
│   └── migrations/
│       └── 20260604_create_ranking.sql
└── HANDOFF.md
```

---

## 2. 현재 진행 상태

### ✅ 완료된 작업

**지역별 공연 목록 패널 (2026-06-02)**
- [x] `GET /api/prfm/by-region?sidonm=&genres=&states=` — venue.sidonm ilike → prfm 교차 → venuedetail 좌표, 최대 200건
- [x] `RegionPerformancePanel.tsx` 초기 버전 (이후 순위 패널로 전면 교체)

**DEV afterdate 파라미터 (2026-06-02)**
- [x] `sync-prfm`: POST body `{ afterdate?: string }` 수신, 기본값 오늘
- [x] `sync-venues`: POST body `{ afterdate?: string }` 수신, 미지정 시 전체 수집
- [x] `SyncPrfmButton`, `SyncVenuesButton`: 날짜 입력 → YYYYMMDD 변환 후 body 포함

**검색 기능 (2026-06-02)**
- [x] `GET /api/prfm/search?q=&states=` — 공연명 ilike, 공연 상태 필터, 최대 10건 (장르 필터 없음 — 전체 검색)
- [x] `SearchBar.tsx` — 300ms 디바운스, 드롭다운 결과 클릭 → 지도 줌인 + 상세 직행
- [x] 선택 마커 이미지 교체 (`markerMap`, `useMapStore.subscribe`)

**검색 → 공연 상세 직행 (2026-06-02)**
- [x] `pendingPrfmId` store 추가 → PerformanceSidebar에서 변경 감지 → `handlePrfmClick` 자동 호출

**공연 상세 UI (2026-06-02)**
- [x] `GET /api/prfm/[id]` — prfm + prfmdetail 조인, relates JSON.parse
- [x] `PerformanceDetail.tsx` 전면 재작성

**필터 UI (2026-06-02)**
- [x] `GenreFilter.tsx`: 장르 9개 + 상태 3개, 접기/펼치기, 최소 1개 강제
- [x] 기본값: 장르 `["뮤지컬", "연극"]`, 상태 `["공연중"]`

---

**공연 순위 스케줄러 (2026-06-04)**
- [x] `scheduler/types/ranking.ts`, `scheduler/mappers/rankingMapper.ts`, `scheduler/apis/ranking.ts`
- [x] `scheduler/index.ts`: 매일 05:00 KST cron 등록

**DEV 공연 순위 수집 버튼 (2026-06-04)**
- [x] `POST /api/sync-ranking`, `SyncRankingButton.tsx`

---

**공연 순위 수집 버그 수정 (2026-06-04)**
- [x] `prfm_ranking` 테이블 DDL, 테이블명 통일, WAF 차단 해결 (Accept-Encoding + zlib)
- [x] boxoffice XML 태그 수정 (`<boxofs><boxof>`), catecode 컬럼 추가

**지역별 공연 순위 패널 완성 (2026-06-04)**
- [x] `GET /api/areas/catecodes`, `GET /api/ranking?area=&catecode=`
- [x] `RegionPerformancePanel.tsx`: 지역 select + 장르 select → 순위 목록

---

**모바일 반응형 레이아웃 (2026-06-05)**

- [x] **SearchBar**: 모바일에서 `w-full`, `left-14 right-24` (GenreFilter·DevPanel 버튼 사이 전체 너비). sm+ 에서 `w-80` 중앙 고정
- [x] **GenreFilter**: 모바일(`< 640px`) 마운트 시 자동 collapsed. `useEffect`에서 `window.innerWidth` 체크
- [x] **PerformanceSidebar**: 모바일에서 하단 sheet (`bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl`, `translate-y` 슬라이드). sm+ 에서 우측 슬라이드 유지. 모바일 배경 오버레이(`z-[9]`) 클릭으로 닫기 추가
- [x] **RegionPerformancePanel**: 모바일에서 우하단 플로팅 원형 버튼(`fixed bottom-20 right-4`) + 하단 sheet (`h-[60vh] rounded-t-2xl`). sm+ 에서 우측 세로 탭 유지. 패널 내용을 `panelContent` JSX 변수로 분리하여 데스크탑/모바일 공유. 모바일 배경 오버레이(`z-[8]`) 추가

---

**UI·UX 개선 (2026-06-05)**

- [x] **RegionPerformancePanel 토글 탭**: X 버튼 제거. 패널 왼쪽에 세로 탭 버튼(`BarChart2` 아이콘 + "지역별 순위" 세로 텍스트)이 항상 붙어있고 클릭 시 패널 열기/닫기. 기본값: 닫힘
- [x] **DEV 버튼 그룹화**: `DevPanel.tsx` 신규 — "DEV ▼" 버튼 하나로 접기/펼치기. `page.tsx`에서 4개 개별 import 제거 후 `<DevPanel />` 단일 사용
- [x] **검색 전체 검색 전환**: `SearchBar.tsx` — 장르 파라미터 제거, 공연 상태만 필터 (`states` 파라미터). `/api/prfm/search` 장르 필터 코드 제거
- [x] **검색 상태 필터 규칙**: 공연중·공연예정은 항상 검색 포함. 공연완료는 필터에서 선택된 경우에만 추가
- [x] **검색 → 장르 자동 전환**: 검색 결과 클릭 시 해당 공연의 장르가 `activeGenres`에 없으면 자동 활성화 + 토스트 `'OOO 필터가 선택되었습니다'` (3초 후 소멸)
- [x] **순위 클릭 → 공연 상세 직행**: `/api/ranking` 응답에 `venueid`, `la`, `lo`, `state` 추가 (prfmdetail·venuedetail·prfm 조인). 클릭 시 `setZoomTarget` + `selectVenue` + `setPendingPrfmId` — 검색과 동일한 흐름
- [x] **순위 클릭 → 상태 자동 전환**: 해당 공연 state가 `activeStates`에 없으면 자동 활성화 + 토스트
- [x] **순위 숫자 스타일**: 원형 배지 제거, 숫자만 표기. 1위 보라색, 2위 보라색, 3위 보라색, 나머지 회색 (사용자가 직접 조정함)
- [x] **mapStore 액션 추가**: `enableGenre(genre)` — 이미 있으면 무시, 없으면 추가. `enableState(state)` — 동일. `openDirectPrfm(prfmId)` — venue 없이 사이드바 직행 (현재 미사용, 순위는 venueid 기반 직행으로 전환)

**버그 수정 (2026-06-05)**

- [x] **마커 미표시 버그** (`/api/venues`): `prfm.venuenm ↔ venue.venuenm` 문자열 매칭으로 조인하던 로직을 `prfm → prfmdetail.venueid → venuedetail.좌표` venueid 기반 조인으로 전면 교체. 이름이 조금이라도 다른 공연장(예: FC001213)이 마커에서 누락되던 문제 해결

### 🔄 진행 중

- prfmdetail relates 컬럼 update 중 (DEV 버튼, 26페이지부터 재시작 예정)

### ⬜ 미완료 / 예정 작업

**배포 전 필수**
- [ ] DEV 버튼 4개 `process.env.NODE_ENV === 'development'` 조건 처리
- [ ] `sync-venues`, `sync-prfm`, `sync-prfm-detail`, `sync-ranking` Bearer 인증 추가
- [ ] `SyncVenuesButton`, `SyncPrfmButton`, `SyncRankingButton` AbortController timeout 추가

**추가 기능**
- [ ] 캐스팅 페어 UI (prfmcast 텍스트 → 구조화된 페어 카드)
- [x] 모바일 반응형 레이아웃
- [ ] 공연 즐겨찾기 / 알림 (예매일 기반 push)
- [ ] 공연 상세 URL share (SEO / OG 메타태그)

---

## 3. 주요 설계 결정사항

### prfm_ranking 테이블 DDL

```sql
CREATE TABLE public.prfm_ranking (
  id         bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  genrenm    text         NOT NULL,
  rank       integer      NOT NULL,
  prfmnm     text         NOT NULL,
  period     text,
  venuenm    text,
  prfdtcnt   integer,
  area       text,
  posterurl  text,
  prfmid     text,
  catecode   text,
  crdt       date         NOT NULL,
  created_at timestamptz  DEFAULT now()
);
```

> **기존 테이블에 id 시퀀스 없으면**: Supabase SQL Editor에서
> ```sql
> CREATE SEQUENCE IF NOT EXISTS public.prfm_ranking_id_seq;
> SELECT setval('public.prfm_ranking_id_seq', COALESCE((SELECT MAX(id) FROM public.prfm_ranking), 0) + 1, false);
> ALTER TABLE public.prfm_ranking ALTER COLUMN id SET DEFAULT nextval('public.prfm_ranking_id_seq');
> ALTER SEQUENCE public.prfm_ranking_id_seq OWNED BY public.prfm_ranking.id;
> ```

### 공연 순위 수집 설계

- **테이블**: `prfm_ranking` (날짜별 이력 누적, upsert 아닌 insert)
- **중복 방지**: 수집 전 `crdt = 오늘` 존재 여부 확인 → 있으면 skip
- **조합 수집**: `code_mng(area)` × `code_mng(catecode)` 전체 순열 → 각각 KOPIS boxoffice API 호출
- **KOPIS 파라미터**: `stdate`=어제, `eddate`=어제+1달, `area`=code, `catecode`=code
- **catecode 저장**: API 요청에 사용한 `catecode` 값을 `prfm_ranking.catecode` 컬럼에 함께 저장

### boxoffice WAF 차단 해결

- **현상**: KOPIS boxoffice 엔드포인트는 WAF가 엄격해 `Accept-Encoding` 없는 요청을 HTTP 400으로 차단
- **해결**: KOPIS_HEADERS에 `Accept-Encoding: gzip, deflate` 포함 전체 브라우저 헤더 세트 적용
- **주의**: `Accept-Encoding` 선언 시 서버가 gzip 응답 가능 → `zlib`으로 `content-encoding` 감지 후 자동 디코딩

### boxoffice XML 구조

```xml
<boxofs>
  <boxof>
    <cate>복합</cate>
    <rnum>1</rnum>
    <prfnm>공연명</prfnm>
    <prfpd>2026.06.05~2026.06.06</prfpd>
    <prfdtcnt>2</prfdtcnt>
    <area>부산</area>
    <prfplcnm>공연장명</prfplcnm>
    <poster>http://...</poster>
    <mt20id>PF291043</mt20id>
  </boxof>
</boxofs>
```

- 루트: `boxofs` / 아이템: `boxof` (다른 KOPIS API의 `dbs`/`db`와 다름)
- `fast-xml-parser` 설정: `isArray: (tagName) => ["boxof"].includes(tagName)`
- 파싱 경로: `parsed?.boxofs?.boxof`

### 공연 순위 조회 API 설계

- **엔드포인트**: `GET /api/ranking?area=서울&catecode=CCCA`
- **area 필터값**: `code_mng(area).codeNm` (지역 한글명)
- **catecode 필터값**: `code_mng(catecode).code` (KOPIS 코드값)
- **날짜**: 파라미터 없이 자동으로 `MAX(crdt)` 조회 후 사용
- **응답에 포함**: `rank`, `prfmnm`, `venuenm`, `period`, `prfdtcnt`, `posterurl`, `prfmid`, `venueid`, `la`, `lo`, `state`
  - `venueid`/`la`/`lo`: prfmdetail + venuedetail 조인으로 추가
  - `state`: prfm 테이블 조인으로 추가

### RegionPerformancePanel select 값 설계

| select | value | 표시 | 필터 대상 컬럼 |
|--------|-------|------|------------|
| 지역 | `codeNm` (한글명) | `codeNm` | `prfm_ranking.area` |
| 장르 | `code` (CCCA 등) | `codeNm` | `prfm_ranking.catecode` |

### 검색 기능 설계

- **장르**: 전체 검색 (genres 파라미터 없음)
- **상태**: `states` 파라미터로 API 전달. 항상 공연중·공연예정 포함, 공연완료는 `activeStates`에 있을 때만 추가
- **결과 클릭 흐름**: 장르 자동 전환(`enableGenre`) → `setZoomTarget` → `setPendingPrfmId` → `selectVenue`
- **토스트**: 장르/상태 자동 전환 시 `'OOO 필터가 선택되었습니다'` 3초 표시

### 순위 클릭 흐름

검색 결과 클릭과 동일:
1. 상태 자동 전환 필요 시 `enableState` + 토스트
2. `setZoomTarget({ lat, lng, level: 4 })`
3. `selectVenue(venueid)` — 사이드바 열기
4. `setPendingPrfmId(prfmid)` — PerformanceSidebar가 감지 → 공연 상세 자동 진입

### /api/venues 마커 조인 방식

**구 방식 (버그)**: `prfm.venuenm ↔ venue.venuenm` 문자열 매칭 → 이름 불일치 시 마커 누락  
**현 방식**: `prfm(prfmid) → prfmdetail(venueid) → venuedetail(la, lo)` venueid 기반 조인

### mapStore 액션 목록

| 액션 | 설명 |
|------|------|
| `setBounds` | 지도 bounds 업데이트 |
| `selectVenue(id)` | 공연장 선택 + 사이드바 열기 |
| `setVenueMarkers` | 마커 목록 업데이트 |
| `toggleGenre(genre)` | 장르 토글 (최소 1개 강제) |
| `enableGenre(genre)` | 장르 강제 활성화 (이미 있으면 무시) |
| `toggleState(state)` | 상태 토글 (최소 1개 강제) |
| `enableState(state)` | 상태 강제 활성화 (이미 있으면 무시) |
| `closeSidebar` | 사이드바 닫기 |
| `setZoomTarget` | 지도 이동 트리거 |
| `setPendingPrfmId` | 공연 상세 자동 진입 트리거 |
| `openDirectPrfm` | venue 없이 사이드바+상세 직행 (현재 미사용) |

### crdt 컬럼 형식

- **DB 저장**: `date` 타입, `"YYYY-MM-DD"` 포맷
- **KOPIS API 파라미터**: `"YYYYMMDD"` 포맷 (혼동 주의)

### DEV route에서 node:http를 사용하는 이유

- Next.js App Router global `fetch` 패치 → 내부 헤더 추가 → KOPIS WAF HTTP 400 차단
- `node:http`/`node:https` 직접 사용으로 전송 헤더 완전 제어
- **새 KOPIS API 호출 코드 작성 시 동일 패턴 적용 필수**

### 기타 설계 결정

- **relates 컬럼**: `prfmdetail.relates` — `text` nullable. 저장: `JSON.stringify`, 읽기: `JSON.parse` + null 체크 필수
- **클러스터러**: 초기화 시 전체 1회 fetch → 클러스터러 전체 등록 (bounds_changed 재요청 X)
- **sync-prfm-detail 재시작**: 실패 시 로그 `page N` 확인 → DEV 버튼 startPage 입력란에 N 입력
- **Kakao Map 생성자 이름 충돌**: `const { Map: KakaoMapCtor, ... } = window.kakao.maps` — 내장 `Map`과 이름 충돌 방지 rename 유지 필수

---

## 4. 파일별 역할 요약

### Next.js 앱

| 파일 | 역할 |
|------|------|
| `src/types/index.ts` | 전체 TypeScript 타입. `AreaCode`, `VenueMarker`, `VenueInfo`, `VenuePerformance`, `RegionPerformance`, `SearchResult`, `KopisPrfmFull`, `KopisRelate`, `ApiResponse` |
| `src/store/mapStore.ts` | Zustand — bounds, selectedVenueId, venueMarkers, activeGenres, activeStates, isSidebarOpen, zoomTarget, pendingPrfmId. `enableGenre`, `enableState`, `openDirectPrfm` 포함 |
| `src/lib/supabase.ts` | Supabase 클라이언트 싱글턴 |
| `src/lib/utils.ts` | `cn()` 유틸 |
| `src/app/api/areas/route.ts` | `code_mng` codeSe='area' 목록 반환 |
| `src/app/api/areas/catecodes/route.ts` | `code_mng` codeSe='catecode' 목록 반환 |
| `src/app/api/ranking/route.ts` | prfm_ranking 조회. area+catecode 필터, MAX(crdt) 자동 기준. venueid·la·lo·state 포함 (prfmdetail·venuedetail·prfm 조인) |
| `src/app/api/venues/route.ts` | prfm→prfmdetail(venueid)→venuedetail(좌표) venueid 기반 조인. genres·states 필터 |
| `src/app/api/venues/[id]/route.ts` | 공연장 상세 (venue+venuedetail+theatre 통합) |
| `src/app/api/venues/[id]/performances/route.ts` | 시설별 공연 목록. genres·states 필터 지원 |
| `src/app/api/prfm/[id]/route.ts` | 공연 상세. prfm+prfmdetail 조인, relates JSON.parse |
| `src/app/api/prfm/search/route.ts` | 공연명 ilike 전체 검색. states 필터만 적용. 최대 10건 |
| `src/app/api/prfm/by-region/route.ts` | 지역별 공연 목록. 최대 200건 |
| `src/app/api/sync-ranking/route.ts` | [DEV] 공연 순위 수집. node:http + zlib |
| `src/app/api/sync-prfm/route.ts` | [DEV] 공연 목록 수집. afterdate 파라미터 지원 |
| `src/app/api/sync-venues/route.ts` | [DEV] 공연시설 수집. afterdate 파라미터 지원 |
| `src/app/api/sync-prfm-detail/route.ts` | [DEV] relates update. startPage 재시작 지원 |
| `src/components/map/KakaoMap.tsx` | 카카오맵 초기화. markerMap 선택 마커 이미지 교체. zoomTarget 구독 |
| `src/components/filter/GenreFilter.tsx` | 좌측 고정 패널 — 장르 9개 + 상태 3개. 접기/펼치기 |
| `src/components/search/SearchBar.tsx` | 검색바. 전체 검색(장르 무관), states 필터. 결과 클릭 → 장르 자동 전환 + 토스트 + 줌 + 상세 직행 |
| `src/components/sidebar/RegionPerformancePanel.tsx` | 우측 탭 토글 패널. 기본 닫힘. 탭 버튼 항상 표시. 순위 클릭 → 상태 자동 전환 + 토스트 + 지도이동 + 상세 직행 |
| `src/components/sidebar/PerformanceSidebar.tsx` | 마커 클릭 → 공연장 정보 + 상태별 공연 목록. pendingPrfmId 구독 → 상세 자동 진입 |
| `src/components/sidebar/PerformanceDetail.tsx` | 공연 상세 뷰 — 포스터, 기본정보, 출연진, 티켓가격, 제작사, 예매처 링크 |
| `src/components/debug/DevPanel.tsx` | [DEV] 4개 sync 버튼 접기/펼치기 래퍼. "DEV ▼" 버튼 토글 |
| `src/components/debug/SyncRankingButton.tsx` | [DEV] 순위 수집 트리거 |
| `src/components/debug/SyncVenuesButton.tsx` | [DEV] afterdate 날짜 입력 + 수집 트리거 |
| `src/components/debug/SyncPrfmButton.tsx` | [DEV] afterdate 날짜 입력 + 수집 트리거 |
| `src/components/debug/SyncPrfmDetailButton.tsx` | [DEV] startPage 입력 포함 |

### 스케줄러

| 파일 | 역할 |
|------|------|
| `scheduler/index.ts` | cron 등록 (공연시설: 매주 월 03:00 / 공연: 매일 04:00 / 순위: 매일 05:00 KST) |
| `scheduler/apis/ranking.ts` | 공연 순위 수집. code_mng → area×catecode → KOPIS boxoffice → prfm_ranking insert |
| `scheduler/types/ranking.ts` | `KopisRankingDb`, `RankingRow` (catecode 포함) |
| `scheduler/mappers/rankingMapper.ts` | `mapRanking(db, catecode)` — XML → RankingRow |
| `scheduler/utils/dateHelper.ts` | `getTodayISODate`, `getYesterdayYYYYMMDD`, `getMonthLaterYYYYMMDD` 등 |

---

## 5. 환경변수 목록

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_KAKAO_MAP_KEY=...
KOPIS_API_KEY=...
KOPIS_BASE_URL=http://kopis.or.kr/openApi/restful/pblprfr
KOPIS_VENUE_URL=http://kopis.or.kr/openApi/restful/prfplc
KOPIS_PRFMRANK_URL=http://kopis.or.kr/openApi/restful/boxoffice
CRON_SECRET=...
```

> 스케줄러는 `dotenv/config`로 프로젝트 루트 `.env` 로드. `NEXT_PUBLIC_SUPABASE_URL`을 그대로 읽음.

---

## 6. 다음 세션에서 할 작업

### 우선순위 1 — 배포 전 정리 (필수)

- DEV 버튼 4개 `process.env.NODE_ENV === 'development'` 조건 처리
- `sync-venues`, `sync-prfm`, `sync-prfm-detail`, `sync-ranking` Bearer 인증 추가
- `SyncVenuesButton`, `SyncPrfmButton`, `SyncRankingButton` AbortController timeout 추가

### 우선순위 2 — 추가 기능

- 캐스팅 페어 UI, 공연 즐겨찾기·알림, 공연 상세 URL share

---

## 7. 주의사항 / 알려진 이슈

### 🔴 배포 전 반드시 처리

| 이슈 | 위치 | 설명 |
|------|------|------|
| **인증 없는 POST** | sync-* 라우트 4개 | Bearer 인증 없음 |
| **fetch timeout 없음** | DEV 버튼들 | ranking 수집 수십 초 이상 소요 가능 |
| **DEV 버튼 노출** | `DevPanel.tsx` | dev 환경 조건 처리 필수 |

### ⚠️ 특이사항

- **KOPIS boxoffice WAF**: `Accept-Encoding` 없으면 HTTP 400 차단. `sync-ranking/route.ts`에 zlib 디코딩 포함 완전한 브라우저 헤더 세트 적용됨. 새 KOPIS API 엔드포인트 추가 시 동일 패턴 검토 필수

- **boxoffice XML 태그**: `<boxofs><boxof>` — 다른 KOPIS API(`<dbs><db>`)와 다름. `fast-xml-parser` isArray 설정과 파싱 경로 혼동 주의

- **prfm_ranking id 컬럼**: `GENERATED ALWAYS AS IDENTITY` 사용. 기존 테이블이 plain `numeric`이면 시퀀스 수동 연결 필요 (위 DDL 참고)

- **crdt 포맷**: DB 저장 `YYYY-MM-DD` / KOPIS API 파라미터 `YYYYMMDD`. 두 함수 혼용 금지

- **DB 컬럼명 vs KOPIS XML 필드명**: KOPIS는 `prfpdfrom`/`prfpdto`, DB는 `prfmfrom`/`prfmto`

- **Kakao Map 생성자 rename**: `const { Map: KakaoMapCtor }` — 내장 `Map`과 충돌 방지. 이 패턴 유지 필수

- **relates 파싱**: `prfmdetail.relates`는 text. 읽을 때 `JSON.parse` + null 체크 필수

- **검색 상태 필터**: 공연중·공연예정은 activeStates 무관 항상 포함. 공연완료만 activeStates 조건부

- **SyncRankingButton 응답 지연**: area×catecode 조합 × 100ms → 수십 초 소요. 정상 동작

- **스케줄러 실행**:
  ```bash
  cd scheduler && npm install && npm start
  ```
