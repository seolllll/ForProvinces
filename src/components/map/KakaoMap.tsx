"use client";

import { useRef, useCallback } from "react";
import Script from "next/script";
import { useMapStore } from "@/store/mapStore";
import type { VenueMarker, MapBounds } from "@/types";
import markerImg from "@/images/marker.png";

// ─────────────────────────────────────────
// Kakao Maps SDK 최소 타입 선언
// ─────────────────────────────────────────
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (container: HTMLElement, opts: object) => KakaoMapInstance;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        MarkerClusterer: new (opts: object) => KakaoClusterer;
        Marker: new (opts: object) => KakaoMarker;
        MarkerImage: new (src: string, size: KakaoSize) => KakaoMarkerImage;
        Size: new (width: number, height: number) => KakaoSize;
        event: {
          addListener: (target: object, type: string, cb: () => void) => void;
        };
      };
    };
  }
}

interface KakaoMapInstance {
  getBounds: () => KakaoBounds;
}
interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}
interface KakaoBounds {
  getSouthWest: () => KakaoLatLng;
  getNorthEast: () => KakaoLatLng;
}
interface KakaoClusterer {
  addMarkers: (markers: KakaoMarker[]) => void;
  clear: () => void;
}
interface KakaoMarker {
  setMap?: (map: KakaoMapInstance | null) => void;
}
interface KakaoMarkerImage {}
interface KakaoSize {}

// ─────────────────────────────────────────
// KakaoMap 컴포넌트
// ─────────────────────────────────────────
export default function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);

  const { setBounds, setVenueMarkers, selectVenue } = useMapStore();

  // ── SDK 로드 완료 시 지도 초기화 ──────
  // autoload=false: kakao 객체만 준비, maps.load() 콜백 안에서만 생성자 사용 가능
  const initMap = useCallback(() => {
    if (mapRef.current || !containerRef.current) return;

    if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
      console.error("[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.");
      return;
    }

    window.kakao.maps.load(() => {
      const { Map, LatLng, MarkerClusterer, Marker, MarkerImage, Size, event } = window.kakao.maps;

      const map = new Map(containerRef.current!, {
        center: new LatLng(36.5, 127.8), // 전국 중심
        level: 13,
      });

      const clusterer = new MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 5,
        disableClickZoom: false,
        styles: [
          {
            width: "45px",
            height: "45px",
            background: "rgba(124,58,237,0.85)",
            borderRadius: "23px",
            color: "#fff",
            textAlign: "center",
            fontWeight: "700",
            lineHeight: "45px",
            fontSize: "14px",
          },
        ],
      });

      mapRef.current = map;
      clustererRef.current = clusterer;

      // ── 마커 전체를 1회 fetch → 클러스터러에 등록 ──────────────────
      // bounds_changed마다 재요청하면 뷰마다 마커 세트가 바뀌어 클러스터 값이 불일치함.
      // 공연중 공연장은 수백 건 수준이므로 전체를 한 번에 받아 클러스터러가 직접 처리.
      fetch("/api/venues")
        .then((r) => r.json())
        .then((json) => {
          const markers: VenueMarker[] = json.data ?? [];
          setVenueMarkers(markers);

          const markerImage = new MarkerImage(markerImg.src, new Size(65, 35));
          const kakaoMarkers = markers.map((v) => {
            const marker = new Marker({
              position: new LatLng(v.latitude, v.longitude),
              image: markerImage,
            });
            event.addListener(marker, "click", () => selectVenue(v.id));
            return marker;
          });
          clusterer.addMarkers(kakaoMarkers);
        })
        .catch((e) => console.error("[KakaoMap] 마커 fetch 실패:", e));

      // ── bounds_changed: 사이드바용 bounds 추적만 담당 ──
      const handleBoundsChange = () => {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        const bounds: MapBounds = {
          swLat: sw.getLat(),
          swLng: sw.getLng(),
          neLat: ne.getLat(),
          neLng: ne.getLng(),
        };
        setBounds(bounds);
      };

      event.addListener(map, "bounds_changed", handleBoundsChange);
      handleBoundsChange();
    });
  }, [setBounds, setVenueMarkers, selectVenue]);

  return (
    <>
      {/*
        onReady: 스크립트 첫 로드 + 이후 컴포넌트 재마운트 시에도 실행됨
        onLoad: 캐시에 스크립트가 이미 있으면 발화 안 하는 케이스 있음
        autoload=false: kakao 객체만 준비, load() 호출 전까지 지도 초기화 안 함
      */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=clusterer&autoload=false`}
        strategy="afterInteractive"
        onReady={initMap}
      />
      {/* absolute inset-0: main의 h-screen/w-screen을 정확히 꽉 채움 */}
      <div ref={containerRef} className="absolute inset-0" />
    </>
  );
}
