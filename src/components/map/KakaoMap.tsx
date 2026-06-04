"use client";

import { useRef, useCallback } from "react";
import Script from "next/script";
import { useMapStore } from "@/store/mapStore";
import type { VenueMarker, MapBounds } from "@/types";
import defaultMarkerImg from "@/images/defaultMarker.png";
import selectedMarkerImg from "@/images/marker.png";

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
  setCenter: (latlng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
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
  setImage: (image: KakaoMarkerImage) => void;
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

  const initMap = useCallback(() => {
    if (mapRef.current || !containerRef.current) return;

    if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
      console.error("[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.");
      return;
    }

    window.kakao.maps.load(() => {
      const { Map: KakaoMapCtor, LatLng, MarkerClusterer, Marker, MarkerImage, Size, event } = window.kakao.maps;

      const map = new KakaoMapCtor(containerRef.current!, {
        center: new LatLng(36.5, 127.8),
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

      const defaultMarkerImage = new MarkerImage(defaultMarkerImg.src, new Size(65, 35));
      const selectedMarkerImage = new MarkerImage(selectedMarkerImg.src, new Size(65, 35));

      // venueid → 마커 인스턴스 (선택 상태 이미지 교체용)
      const markerMap = new Map<string, KakaoMarker>();

      // 장르 목록으로 마커를 fetch해 클러스터러에 등록
      function loadMarkers(genres: string[], states: string[]) {
        const genresQ = genres.map((g) => encodeURIComponent(g)).join(",");
        const statesQ = states.map((s) => encodeURIComponent(s)).join(",");
        fetch(`/api/venues?genres=${genresQ}&states=${statesQ}`)
          .then((r) => r.json())
          .then((json) => {
            const venues: VenueMarker[] = json.data ?? [];
            setVenueMarkers(venues);

            markerMap.clear();
            clusterer.clear();
            const currentSelectedId = useMapStore.getState().selectedVenueId;
            const kakaoMarkers = venues.map((v) => {
              const marker = new Marker({
                position: new LatLng(v.latitude, v.longitude),
                image: v.id === currentSelectedId ? selectedMarkerImage : defaultMarkerImage,
              });
              event.addListener(marker, "click", () => selectVenue(v.id));
              markerMap.set(v.id, marker);
              return marker;
            });
            clusterer.addMarkers(kakaoMarkers);
          })
          .catch((e) => console.error("[KakaoMap] 마커 fetch 실패:", e));
      }

      // 초기 로드
      const init = useMapStore.getState();
      loadMarkers(init.activeGenres, init.activeStates);

      // 장르/상태/선택 공연장/줌 변경 구독
      let prevGenres = init.activeGenres;
      let prevStates = init.activeStates;
      let prevZoomTarget = init.zoomTarget;
      let prevSelectedVenueId = init.selectedVenueId;
      useMapStore.subscribe((state) => {
        if (state.activeGenres !== prevGenres || state.activeStates !== prevStates) {
          prevGenres = state.activeGenres;
          prevStates = state.activeStates;
          loadMarkers(state.activeGenres, state.activeStates);
        }
        if (state.selectedVenueId !== prevSelectedVenueId) {
          if (prevSelectedVenueId) {
            markerMap.get(prevSelectedVenueId)?.setImage(defaultMarkerImage);
          }
          if (state.selectedVenueId) {
            markerMap.get(state.selectedVenueId)?.setImage(selectedMarkerImage);
          }
          prevSelectedVenueId = state.selectedVenueId;
        }
        if (state.zoomTarget !== prevZoomTarget && state.zoomTarget) {
          prevZoomTarget = state.zoomTarget;
          map.setCenter(new LatLng(state.zoomTarget.lat, state.zoomTarget.lng));
          map.setLevel(state.zoomTarget.level);
        }
      });

      // bounds_changed: 사이드바용 bounds 추적
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
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=clusterer&autoload=false`}
        strategy="afterInteractive"
        onReady={initMap}
      />
      <div ref={containerRef} className="absolute inset-0" />
    </>
  );
}
