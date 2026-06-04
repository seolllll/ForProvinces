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
│   │       ├── areas/route.ts                    # GET: code_mng codeSe='area' 목록
│   │       ├── areas/catecodes/route.ts           # GET: code_mng codeSe='catecode' 목록
│   │       ├── ranking/route.ts                   # GET: prfm_ranking 조회 (area+catecode+최근crdt)
│   │       ├── venues/route.ts
│   │       ├── venues/[id]/route.ts
│   │       ├── venues/[id]/performances/route.ts
│   │       ├── prfm/[id]/route.ts
│   │       ├── prfm/search/route.ts
│   │       ├── prfm/by-region/route.ts
│   │       ├── sync-ranking/route.ts             # POST: [DEV] 공연 순위 수집
│   │       ├── sync-venues/route.ts
│   │       ├── sync-prfm/route.ts
│   │       └── sync-prfm-detail/route.ts
│   ├── components/
│   │   ├── map/KakaoMap.tsx
│   │   ├── filter/GenreFilter.tsx
│   │   ├── search/SearchBar.tsx
│   │   ├── sidebar/PerformanceSidebar.tsx
│   │   ├── sidebar/PerformanceDetail.tsx
│   │   ├── sidebar/RegionPerformancePanel.tsx    # 우측 패널 — 지역+장르 select → 순위 목록
│   │   ├── debug/SyncVenuesButton.tsx
│   │   ├── debug/SyncPrfmButton.tsx
│   │   ├── debug/SyncPrfmDetailButton.tsx
│   │   └── debug/SyncRankingButton.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── store/mapStore.ts
│   └── types/index.ts
├── scheduler/
│   ├── index.ts
│   ├── apis/venue.ts, venueDetail.ts, prfm.ts, prfmDetail.ts, ranking.ts
│   ├── types/prfm.ts, ranking.ts
│   ├── mappers/                                  # XML → DB 행 변환
│   └── utils/supabase.ts, fetchKopis.ts, xmlParser.ts, delay.ts, dateHelper.ts
├── supabase/
│   └── migrations/
│       └── 20260604_create_ranking.sql           # prfm_ranking 테이블 DDL
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
- [x] `GET /api/prfm/search?q=&genres=` — 공연명 ilike, 장르 필터, 최대 10건
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
- [x] `scheduler/types/ranking.ts`: `KopisRankingDb`, `RankingRow` (catecode 필드 포함)
- [x] `scheduler/mappers/rankingMapper.ts`: `mapRanking(db, catecode)` — XML → RankingRow
- [x] `scheduler/apis/ranking.ts`: area × catecode 조합 수집, 중복 방지(crdt 확인), 100ms 딜레이
- [x] `scheduler/index.ts`: 매일 05:00 KST cron 등록

**DEV 공연 순위 수집 버튼 (2026-06-04)**
- [x] `POST /api/sync-ranking` — 스케줄러와 동일 로직, node:http 사용
- [x] `SyncRankingButton.tsx` — 🏆 [DEV] 순위 수집

---

**공연 순위 수집 버그 수정 (2026-06-04)**
- [x] **500 에러 원인**: `prfm_ranking` 테이블 미생성 → `supabase/migrations/20260604_create_ranking.sql` 작성
- [x] **테이블명**: `ranking` → `prfm_ranking` 으로 통일 (route.ts, scheduler/apis/ranking.ts 모두 수정)
- [x] **WAF 차단 해결**: boxoffice 엔드포인트가 `Accept-Encoding` 없으면 HTTP 400 차단
  - `sync-ranking/route.ts` KOPIS_HEADERS에 `Accept-Encoding: gzip, deflate`, `Connection: keep-alive`, `Cache-Control: max-age=0`, `Upgrade-Insecure-Requests: 1` 추가
  - `zlib` import + `content-encoding` 헤더 감지해 gzip/deflate 자동 디코딩 추가
- [x] **XML 파싱 태그 수정**: boxoffice API 응답은 `<dbs><db>` 아니라 `<boxofs><boxof>` 구조
  - `isArray: ["boxof"]`, `parsed?.boxofs?.boxof` 로 수정
- [x] **catecode 컬럼 추가**: 요청 파라미터 `catecode` 값을 `prfm_ranking.catecode`에 저장
  - `RankingRow`에 `catecode: string` 추가
  - `mapRanking(db, catecode)` 두 번째 인자 추가
  - `scheduler/apis/ranking.ts`, `src/app/api/sync-ranking/route.ts` rows에 `catecode` 포함
- [x] **Supabase id 컬럼**: `bigserial` → `GENERATED ALWAYS AS IDENTITY` 로 DDL 수정 (기존 테이블은 시퀀스 수동 연결 필요)

**지역별 공연 순위 패널 완성 (2026-06-04)**
- [x] `GET /api/areas/catecodes` 신규: `code_mng.codeSe='catecode'` 목록 반환
- [x] `GET /api/ranking?area=&catecode=` 신규:
  - `prfm_ranking`에서 가장 최근 `crdt` 자동 조회
  - `WHERE area = #{area} AND catecode = #{catecode} AND crdt = #{최근crdt}` 필터
  - `rank` 오름차순 정렬, 응답에 `crdt` 포함
- [x] `RegionPerformancePanel.tsx` 전면 개편:
  - 지역 버튼 목록 → **지역 select + 장르 select** 두 개
  - 지역 select: `value={a.codeNm}` (area 이름으로 필터)
  - 장르 select: `value={c.code}` (catecode 코드값으로 필터), 표시는 `codeNm`
  - 초기값: 각 목록의 첫 번째 항목 자동 선택
  - 선택 변경 시 즉시 `/api/ranking` 호출 → 순위 목록 렌더링
  - 1~3위 보라색 배지, 나머지 회색 배지
  - 헤더에 기준 수집일(`crdt`) 표시

### 🔄 진행 중

- prfmdetail relates 컬럼 update 중 (DEV 버튼, 26페이지부터 재시작 예정)

### ⬜ 미완료 / 예정 작업

**배포 전 필수**
- [ ] DEV 버튼 4개 `process.env.NODE_ENV === 'development'` 조건 처리
- [ ] `sync-venues`, `sync-prfm`, `sync-prfm-detail`, `sync-ranking` Bearer 인증 추가
- [ ] `SyncVenuesButton`, `SyncPrfmButton`, `SyncRankingButton` AbortController timeout 추가

**추가 기능**
- [ ] 캐스팅 페어 UI (prfmcast 텍스트 → 구조화된 페어 카드)
- [ ] 모바일 반응형 레이아웃
- [ ] 공연 즐겨찾기 / 알림 (예매일 기반 push)
- [ ] 공연 상세 URL share (SEO / OG 메타태그)

---

## 3. 주요 설계 결정사항

### prfm_ranking 테이블 DDL

```sql
-- supabase/migrations/20260604_create_ranking.sql 참고
CREATE TABLE public.prfm_ranking (
  id         bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  genrenm    text         NOT NULL,   -- KOPIS XML <cate> 값 (예: 복합, 연극)
  rank       integer      NOT NULL,
  prfmnm     text         NOT NULL,
  period     text,
  venuenm    text,
  prfdtcnt   integer,
  area       text,                    -- KOPIS XML <area> 값 (예: 서울, 부산)
  posterurl  text,
  prfmid     text,
  catecode   text,                    -- 요청 파라미터 catecode 값 (예: CCCA, CCCD)
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
- **DEV와 스케줄러**: `sync-ranking/route.ts`와 `scheduler/apis/ranking.ts` 동일 로직

### boxoffice WAF 차단 해결

- **현상**: KOPIS boxoffice(`/openApi/restful/boxoffice`) 엔드포인트는 WAF가 엄격해 `Accept-Encoding` 없는 요청을 HTTP 400으로 차단
- **다른 엔드포인트와 비교**:
  - `prfplc` (venue): Next.js global `fetch` 사용 → 정상
  - `pblprfr` (prfm): Next.js global `fetch` → WAF 차단 → `node:http` 직접 사용으로 해결
  - `boxoffice` (ranking): `node:http` + 3개 헤더만으로도 차단 → 헤더 추가 필요
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
    <seatcnt>300</seatcnt>
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
- **area 필터값**: `code_mng(area).codeNm` (지역 한글명 — `prfm_ranking.area`와 동일한 값)
- **catecode 필터값**: `code_mng(catecode).code` (KOPIS 코드값 — `prfm_ranking.catecode`와 동일한 값)
- **날짜**: 파라미터 없이 자동으로 `MAX(crdt)` 조회 후 사용
- **SQL**: `WHERE area = #{area} AND catecode = #{catecode} AND crdt = #{최근crdt} ORDER BY rank`

### RegionPerformancePanel select 값 설계

| select | value | 표시 | 필터 대상 컬럼 |
|--------|-------|------|------------|
| 지역 | `codeNm` (한글명) | `codeNm` | `prfm_ranking.area` |
| 장르 | `code` (CCCA 등) | `codeNm` | `prfm_ranking.catecode` |

- 지역은 한글명(`codeNm`)으로 필터 — KOPIS XML `<area>` 값과 동일
- 장르는 코드값(`code`)으로 필터 — 수집 시 저장한 `catecode`와 동일

### 검색 기능 설계

- **배치**: `absolute left-1/2 top-4 -translate-x-1/2` 지도 상단 중앙 고정
- **장르 필터 연동**: `activeGenres`를 store에서 읽어 검색 쿼리에 포함
- **결과 클릭 흐름**: `setZoomTarget` → `setPendingPrfmId` → `selectVenue`
- **pendingPrfmId**: PerformanceSidebar가 변경 감지 → `handlePrfmClick` 자동 호출 후 null 초기화

### crdt 컬럼 형식

- **DB 저장**: `date` 타입, `"YYYY-MM-DD"` 포맷
- **KOPIS API 파라미터**: `"YYYYMMDD"` 포맷 (혼동 주의)
- **스케줄러**: `getTodayISODate()` 사용
- **Next.js API**: `new Date().toISOString().slice(0, 10)`

### DEV route에서 node:http를 사용하는 이유

- Next.js App Router global `fetch` 패치 → 내부 헤더 추가 → KOPIS WAF HTTP 400 차단
- `node:http`/`node:https` 직접 사용으로 전송 헤더 완전 제어
- **새 KOPIS API 호출 코드 작성 시 동일 패턴 적용 필수**
- `sync-venues`는 prfplc 엔드포인트, WAF 차단 없어 global fetch 유지

### 기타 설계 결정

- **relates 컬럼**: `prfmdetail.relates` — `text` nullable. 저장: `JSON.stringify`, 읽기: `JSON.parse` + null 체크 필수
- **클러스터러**: 초기화 시 전체 1회 fetch → 클러스터러 전체 등록 (bounds_changed 재요청 X)
- **venue 전체 조회**: range 페이지네이션으로 로컬 로드 후 메모리 교차 (`.in()`은 ASCII venueid에만 사용)
- **sync-prfm-detail 재시작**: 실패 시 로그 `page N` 확인 → DEV 버튼 startPage 입력란에 N 입력
- **Kakao Map 생성자 이름 충돌**: `const { Map: KakaoMapCtor, ... } = window.kakao.maps` — 내장 `Map`과 이름 충돌 방지 rename 유지 필수

---

## 4. 파일별 역할 요약

### Next.js 앱

| 파일 | 역할 |
|------|------|
| `src/types/index.ts` | 전체 TypeScript 타입. `AreaCode`, `VenueMarker`, `VenueInfo`, `VenuePerformance`, `RegionPerformance`, `SearchResult`, `KopisPrfmFull`, `KopisRelate`, `ApiResponse` |
| `src/store/mapStore.ts` | Zustand — bounds, selectedVenueId, venueMarkers, activeGenres, activeStates, isSidebarOpen, zoomTarget, pendingPrfmId |
| `src/lib/supabase.ts` | Supabase 클라이언트 싱글턴 |
| `src/lib/utils.ts` | `cn()` 유틸 |
| `src/app/api/areas/route.ts` | `code_mng` codeSe='area' 목록 반환 (code, codeNm) |
| `src/app/api/areas/catecodes/route.ts` | `code_mng` codeSe='catecode' 목록 반환 (code, codeNm) |
| `src/app/api/ranking/route.ts` | prfm_ranking 조회. area+catecode 필터, MAX(crdt) 자동 기준 |
| `src/app/api/venues/route.ts` | genres·states 필터 기반 공연장 전체 반환 |
| `src/app/api/venues/[id]/route.ts` | 공연장 상세 (venue+venuedetail+theatre 통합) |
| `src/app/api/venues/[id]/performances/route.ts` | 시설별 공연 목록. genres·states 필터 지원 |
| `src/app/api/prfm/[id]/route.ts` | 공연 상세. prfm+prfmdetail 조인, relates JSON.parse |
| `src/app/api/prfm/search/route.ts` | 공연명 ilike 검색. genres 필터. 최대 10건 |
| `src/app/api/prfm/by-region/route.ts` | 지역별 공연 목록. sidonm ilike → prfm 교차 → venuedetail 좌표. 최대 200건 |
| `src/app/api/sync-ranking/route.ts` | [DEV] 공연 순위 수집. code_mng → area×catecode 조합 → prfm_ranking insert. node:http + zlib |
| `src/app/api/sync-prfm/route.ts` | [DEV] 공연 목록+상세 수집. afterdate 파라미터 지원 |
| `src/app/api/sync-venues/route.ts` | [DEV] 공연시설 수집. afterdate 파라미터 지원 |
| `src/app/api/sync-prfm-detail/route.ts` | [DEV] relates update. 딜레이 500ms, WAF 재시도, startPage 재시작 |
| `src/components/map/KakaoMap.tsx` | 카카오맵 초기화. markerMap 선택 마커 이미지 교체. zoomTarget 구독 |
| `src/components/filter/GenreFilter.tsx` | 좌측 고정 패널 — 장르 9개 + 상태 3개. 접기/펼치기 |
| `src/components/search/SearchBar.tsx` | 검색바. 상단 중앙 고정. 300ms 디바운스. 장르 필터 연동. 결과 클릭 → 줌 + 상세 직행 |
| `src/components/sidebar/RegionPerformancePanel.tsx` | 우측 고정 패널(w-64). 지역 select + 장르 select → 공연 순위 목록 표시. 기준일 표시 |
| `src/components/sidebar/PerformanceSidebar.tsx` | 마커 클릭 → 공연장 정보 + 상태별 공연 목록. pendingPrfmId 구독 → 상세 자동 진입 |
| `src/components/sidebar/PerformanceDetail.tsx` | 공연 상세 뷰 — 포스터, 기본정보, 출연진, 티켓가격, 제작사, 예매처 링크 |
| `src/components/debug/SyncRankingButton.tsx` | [DEV] 순위 수집 트리거. 결과: N건 수집 완료 / ⏭️ 이미 수집 완료 |
| `src/components/debug/SyncVenuesButton.tsx` | [DEV] afterdate 날짜 입력(기본 빈값=전체) + 수집 트리거 |
| `src/components/debug/SyncPrfmButton.tsx` | [DEV] afterdate 날짜 입력(기본 오늘) + 수집 트리거 |
| `src/components/debug/SyncPrfmDetailButton.tsx` | [DEV] startPage 입력 포함 |

### 스케줄러

| 파일 | 역할 |
|------|------|
| `scheduler/index.ts` | cron 등록 (공연시설: 매주 월 03:00 / 공연: 매일 04:00 / 순위: 매일 05:00 KST) |
| `scheduler/apis/ranking.ts` | 공연 순위 수집. code_mng → area×catecode → KOPIS boxoffice → prfm_ranking insert |
| `scheduler/types/ranking.ts` | `KopisRankingDb` (API XML 필드), `RankingRow` (catecode 포함) |
| `scheduler/mappers/rankingMapper.ts` | `mapRanking(db, catecode)` — XML → RankingRow. catecode 두 번째 인자 |
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

### 우선순위 2 — UX 버그

- **검색 → 동일 공연장 상세 직행**: `pendingPrfmId` 세팅되어도 `selectedVenueId`가 안 바뀌면 venue 로딩 effect 미트리거 → `pendingPrfmId` 단독 effect에서 직접 처리 필요

### 우선순위 3 — 추가 기능

- 캐스팅 페어 UI, 모바일 반응형, 공연 즐겨찾기·알림, 공연 상세 URL share

---

## 7. 주의사항 / 알려진 이슈

### 🔴 배포 전 반드시 처리

| 이슈 | 위치 | 설명 |
|------|------|------|
| **인증 없는 POST** | sync-* 라우트 4개 | Bearer 인증 없음 |
| **fetch timeout 없음** | DEV 버튼들 | ranking 수집 수십 초 이상 소요 가능 |
| **DEV 버튼 노출** | `page.tsx` | dev 환경 조건 처리 필수 |

### ⚠️ 특이사항

- **KOPIS boxoffice WAF**: `Accept-Encoding` 없으면 HTTP 400 차단. `sync-ranking/route.ts`에 zlib 디코딩 포함 완전한 브라우저 헤더 세트 적용됨. 새 KOPIS API 엔드포인트 추가 시 동일 패턴 검토 필수

- **boxoffice XML 태그**: `<boxofs><boxof>` — 다른 KOPIS API(`<dbs><db>`)와 다름. `fast-xml-parser` isArray 설정과 파싱 경로 혼동 주의

- **prfm_ranking id 컬럼**: `GENERATED ALWAYS AS IDENTITY` 사용. 기존 테이블이 plain `numeric`이면 시퀀스 수동 연결 필요 (위 DDL 참고)

- **crdt 포맷**: DB 저장 `YYYY-MM-DD` / KOPIS API 파라미터 `YYYYMMDD`. 두 함수 혼용 금지

- **DB 컬럼명 vs KOPIS XML 필드명**: KOPIS는 `prfpdfrom`/`prfpdto`, DB는 `prfmfrom`/`prfmto`

- **Kakao Map 생성자 rename**: `const { Map: KakaoMapCtor }` — 내장 `Map`과 충돌 방지. 이 패턴 유지 필수

- **relates 파싱**: `prfmdetail.relates`는 text. 읽을 때 `JSON.parse` + null 체크 필수

- **venuenm 불일치**: `prfm.venuenm`과 `venue.venuenm`이 다르면 마커 미표시

- **SyncRankingButton 응답 지연**: area×catecode 조합 × 100ms → 수십 초 소요. 정상 동작

- **스케줄러 실행**:
  ```bash
  cd scheduler && npm install && npm start
  ```
