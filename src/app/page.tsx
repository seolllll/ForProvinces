import KakaoMap from "@/components/map/KakaoMap";
import CategoryFilter from "@/components/filter/CategoryFilter";
import PerformanceSidebar from "@/components/sidebar/PerformanceSidebar";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 카카오 지도 (전체 화면) */}
      <KakaoMap />

      {/* 카테고리 필터 — 지도 위 상단 고정 */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <CategoryFilter />
      </div>

      {/* 공연 목록/상세 사이드바 */}
      <PerformanceSidebar />
    </main>
  );
}
