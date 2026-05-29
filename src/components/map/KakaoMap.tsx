"use client";

import { useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { useMapStore } from "@/store/mapStore";
import { debounce } from "@/lib/utils";
import type { VenueMarker, MapBounds } from "@/types";

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

// ─────────────────────────────────────────
// KakaoMap 컴포넌트
// ─────────────────────────────────────────
export default function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);

  const { setBounds, setVenueMarkers, selectVenue } = useMapStore();

  // ── 마커 fetch + 렌더 ─────────────────
  const fetchAndRenderMarkers = useCallback(
    async (bounds: MapBounds) => {
      const params = new URLSearchParams({
        swLat: String(bounds.swLat),
        swLng: String(bounds.swLng),
        neLat: String(bounds.neLat),
        neLng: String(bounds.neLng),
      });

      try {
        const res = await fetch(`/api/venues?${params}`);
        const json = await res.json();
        const markers: VenueMarker[] = json.data ?? [];
        setVenueMarkers(markers);

        if (!clustererRef.current) return;
        clustererRef.current.clear();

        const { Marker, LatLng, event } = window.kakao.maps;
        const kakaoMarkers = markers.map((v) => {
          const marker = new Marker({ position: new LatLng(v.latitude, v.longitude) });
          event.addListener(marker, "click", () => selectVenue(v.id));
          return marker;
        });
        clustererRef.current.addMarkers(kakaoMarkers);
      } catch (e) {
        console.error("[KakaoMap] 마커 fetch 실패:", e);
      }
    },
    [setVenueMarkers, selectVenue]
  );

  // 디바운스 래퍼 — bounds_changed 과호출 방지
  const debouncedFetch = useRef(debounce(fetchAndRenderMarkers, 400));
  useEffect(() => {
    debouncedFetch.current = debounce(fetchAndRenderMarkers, 400);
  }, [fetchAndRenderMarkers]);

  // ── SDK 로드 완료 시 지도 초기화 ──────
  // autoload=false: kakao 객체만 준비, maps.load() 콜백 안에서만 생성자 사용 가능
  const initMap = useCallback(() => {
    if (mapRef.current || !containerRef.current) return;

    if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
      console.error("[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.");
      return;
    }

    window.kakao.maps.load(() => {
      const { Map, LatLng, MarkerClusterer } = window.kakao.maps;

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
        debouncedFetch.current(bounds);
      };

      window.kakao.maps.event.addListener(map, "bounds_changed", handleBoundsChange);
      handleBoundsChange();
    });
  }, [setBounds]);

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
