import KakaoMap from "@/components/map/KakaoMap";
import GenreFilter from "@/components/filter/GenreFilter";
import PerformanceSidebar from "@/components/sidebar/PerformanceSidebar";
import RegionPerformancePanel from "@/components/sidebar/RegionPerformancePanel";
import SearchBar from "@/components/search/SearchBar";
import DevPanel from "@/components/debug/DevPanel";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 카카오 지도 (전체 화면) */}
      <KakaoMap />

      {/* 검색바 — 모바일: 필터·DEV 버튼 사이 전체 너비 / sm+: 상단 중앙 */}
      <div className="absolute left-14 right-24 top-4 z-10 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
        <SearchBar />
      </div>

      {/* 장르 필터 — 좌측 고정 */}
      <div className="absolute left-4 top-4 z-10">
        <GenreFilter />
      </div>

      {/* [DEV] 버튼 그룹 — 우상단 */}
      <div className="absolute right-4 top-4 z-10">
        <DevPanel />
      </div>

      {/* 지역별 공연 순위 패널 */}
      <RegionPerformancePanel />

      {/* 공연 목록/상세 사이드바 */}
      <PerformanceSidebar />
    </main>
  );
}
