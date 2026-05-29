# 프로젝트명: ForProvinces

## 1. 프로젝트 개요
전국 지도에 현재 공연 중인 연극, 뮤지컬, 전시회를 클러스터맵으로 시각화하고, 사용자에게 공연 목록, 예매 일정, 캐스팅 페어, 공연 소개 등의 상세 정보를 제공하는 웹 애플리케이션입니다.

## 2. 기술 스택 (Tech Stack)
- **Frontend/Backend:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS, Shadcn UI
- **Database:** PostgreSQL (Supabase) + PostGIS (공간 데이터 처리)
- **ORM:** Prisma
- **Map API:** Kakao Maps API (with Clusterer)

## 3. 핵심 기능 요구사항
1. **클러스터맵 인터페이스:**
   - 전국 공연장 위치를 기반으로 공연 개수를 클러스터링하여 표시
   - 지도 줌 레벨에 따라 마커가 쪼개지거나 합쳐져야 함
   - 마커나 클러스터 클릭 시 해당 지역/공연장의 공연 목록 팝업 또는 사이드바 노출
2. **공연 상세 정보 UI:**
   - 카테고리 필터 (연극 / 뮤지컬 / 전시)
   - 공연 상세: 제목, 포스터, 기간, 예매일(티켓팅 오픈일 알림용), 캐스팅 페어 정보, 소개글
3. **데이터 소스:**
   - 공공데이터포털(KOPIS 재단 공연예술통합전산망 API) 연동 및 자체 DB 스케줄러 적재 구조 고려

## 4. 폴더 구조 규칙 (Directory Map)
- `/src/app`: Next.js 페이지 및 라우팅 핸들러
- `/src/components`: 재사용 가능한 UI 컴포넌트 (지도, 카드, 필터 등)
- `/src/lib`: Prisma 클라이언트, 지도 유틸 함수, API 요청 로직
- `/prisma`: DB 스키마 파일 (`schema.prisma`)

## 5. 코드 작성 및 개발 컨벤션
- **언어 및 타이핑:** 모든 데이터 모델과 API 응답은 엄격한 TypeScript Interface를 정의하여 사용하세요.
- **컴포넌트:** UI는 함수형 컴포넌트와 Lucide React 아이콘을 사용하고, 클라이언트 컴포넌트(`"use client"`)가 필요한 경우(지도 렌더링 등) 명확히 분리하세요.
- **지도 최적화:** 지도 이동(bounds_changed) 이벤트 발생 시 디바운스(Debounce) 처리를 하여 API 요청을 최소화하세요.
- **상태 관리:** React Context 또는 필요한 경우 간단한 Zustand를 활용하세요.

## 6. 실행 및 빌드 명령문
- 의존성 설치: `npm install`
- 개발 서버 실행: `npm run dev`
- DB 마이그레이션: `npx prisma migrate dev`
- Prisma 스튜디오: `npx prisma studio`

# API 활용 서비스 개발 시 아래 사항 함께 명시
- 집계기간 : 최종집계 YYYY.MM.DD
- 집계대상 : 모든 공연 데이터 전송기관
- 아래 집계 데이터는 공연예술통합전산망 연계기관의 티켓판매시스템에서 발권된 분량을 기준으로 제공함으로 해당 공연의 전체 관객 수와 차이가 있을 수 있습니다.